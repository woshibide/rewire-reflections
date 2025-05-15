let DEVELOPMENT = false;             // for debugging

// global variables
let scene, camera, renderer;
let planeGeometry, planeMaterial, plane;
let mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let targetX = 0, targetY = 0;

// color palette for easy customization of the 3d canvas
const COLORS = {
    // ui colors
    primary: 0x4287f5,         // blue - used for author boxes normal state
    secondary: 0x42f5b3,       // teal - used for author boxes hover state
    
    // background and grid colors
    background: 0xf1f1f1,      // light gray - cutting mat background
    majorGrid: 0xbbbbbb,       // medium gray - major grid lines
    minorGrid: 0x999999,       // darker gray - minor grid lines
    
    // utility colors
    white: 0xffffff,           // white - used for markings and labels
    black: 0x000000,           // black - used for text and rendering background
    
    // text labels
    labelText: 'black',        // author label text color
    feedbackText: 'red'        // default text color for feedback elements
};

// center camera coordinates (where camera returns when center function is called)
const CENTER_X = 0;
const CENTER_Y = 0;

const moveSpeed = 0.05;             // panning sensitivity
const edgeTriggerSize = 20;         // size in pixels of the edge trigger area for panning
let isPanning = false;              // if we're currently panning
let panDirection = { x: 0, y: 0 };  // direction of panning
let panSpeed = 0;                   // current panning speed
const maxPanSpeed = 0.1;            // maximum panning speed

// mouse drag panning variables
let isDragging = false;             // if we're currently dragging the scene
let previousMousePosition = { x: 0, y: 0 };
let dragSensitivity = 0.01;         // how sensitive the drag panning is

// pinch-to-zoom variables
let initialPinchDistance = 0;       // initial distance between two touch points
let currentScale = 1;               // current zoom scale
let targetScale = 1;                // target zoom scale
let zoomSpeed = 0.1;                // how fast to zoom
let minScale = 0.5;                 // minimum zoom level
let maxScale = 3;                   // maximum zoom level

// region panning boundaries
let panBoundaries = {
    enabled: true,                 // whether to enforce pan boundaries
    minX: -10,                     // leftmost limit for camera position.x
    maxX: 10,                      // rightmost limit for camera position.x
    minY: -8,                      // bottom limit for camera position.y
    maxY: 8                        // top limit for camera position.y
};

let updateRegionVisualizer = null;  // function to update author region visualizer

// function to center the camera on the canvas
function centerCamera() {
    // store original values for animation
    const originalX = camera.position.x;
    const originalY = camera.position.y;
    const originalScale = targetScale;
    
    // set target position to center coordinates
    targetX = CENTER_X;
    targetY = CENTER_Y;
    
    // reset zoom to default with animation
    const targetZoom = 1;
    
    // animate the transition to center
    const startTime = Date.now();
    const duration = 800; // milliseconds for the animation
    
    function animateToCenter() {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // use easeOutCubic easing function for smooth animation
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // smoothly interpolate camera position
        camera.position.x = originalX + (CENTER_X - originalX) * easeProgress;
        camera.position.y = originalY + (CENTER_Y - originalY) * easeProgress;
        
        // smoothly interpolate zoom
        targetScale = originalScale + (targetZoom - originalScale) * easeProgress;
        
        // continue animation until complete
        if (progress < 1) {
            requestAnimationFrame(animateToCenter);
        } else {
            // ensure final position is exact
            camera.position.x = CENTER_X;
            camera.position.y = CENTER_Y;
            targetScale = targetZoom;
        }
    }
    
    // start the animation
    animateToCenter();
    
    // visual feedback when centering
    // showCenteringFeedback();
    
    // log camera position (using lowercase for comments as per instruction)
    console.log("camera centered to position:", CENTER_X, CENTER_Y);
}

// add visual feedback when the camera is centered
function showCenteringFeedback() {
    // create a circular pulse effect at the center of the scene
    const geometry = new THREE.RingGeometry(0.1, 0.2, 32);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x4287f5,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(geometry, material);
    ring.position.z = 0.5; // position slightly above the grid
    scene.add(ring);
    
    // animate the ring outward and fade it
    const startTime = Date.now();
    const duration = 1000; // 1 second animation
    
    function animatePulse() {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // grow the ring
        const scale = 1 + progress * 5;
        ring.scale.set(scale, scale, 1);
        
        // fade out the ring
        ring.material.opacity = 0.7 * (1 - progress);
        
        // update the scene
        if (progress < 1) {
            requestAnimationFrame(animatePulse);
        } else {
            // remove the ring from the scene when animation completes
            scene.remove(ring);
        }
    }
    
    // start the animation
    animatePulse();
}

// initialize the three.js scene
function initThreeJS() {
    // create scene
    scene = new THREE.Scene();
    
    // create camera (orthographic for top-down view)
    const aspectRatio = window.innerWidth / window.innerHeight;
    const cameraWidth = 10;
    const cameraHeight = cameraWidth / aspectRatio;
    camera = new THREE.OrthographicCamera(
        -cameraWidth / 2, cameraWidth / 2,
        cameraHeight / 2, -cameraHeight / 2,
        0.1, 1000
    );

    camera.position.z = 5;
    
    // create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(COLORS.black, 0); // transparent background
    
    // append to dom
    const container = document.getElementById('background-canvas');
    container.appendChild(renderer.domElement);
    
    // add event listeners
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    window.addEventListener('resize', onWindowResize, false);
    
    // add mouse drag panning event listeners
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);
    document.addEventListener('mouseleave', onMouseUp, false); // treat like mouseup when cursor leaves window
    
    // add mouse wheel zoom event listener
    document.addEventListener('wheel', onMouseWheel, { passive: false });
    
    // add touch event listeners for mobile
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, false);
    
    // add mouse wheel event listener for zooming
    document.addEventListener('wheel', onMouseWheel, false);
    
    // add keyboard shortcut for centering (C key)
    document.addEventListener('keydown', onKeyDown, false);
    
    // create cutting mat background
    createCuttingMatBackground();
    
    // initialize trigger areas visualization if in development mode
    if (DEVELOPMENT && window.initTriggerAreas) {
        window.initTriggerAreas(DEVELOPMENT);
    }
    
    // initialize panning debug controls if in development mode
    if (DEVELOPMENT && window.createPanningDebugControls) {
        window.createPanningDebugControls();
    }
    
    // initialize pan boundaries visualizer if in development mode
    if (DEVELOPMENT && window.visualizePanBoundaries) {
        let updatePanBoundaryVisualizer = window.visualizePanBoundaries();
        // Store in global variable for animation loop
        window.updatePanBoundaryVisualizer = updatePanBoundaryVisualizer;
    }
    
    // start animation
    animate();
}

// Note: initTriggerAreas has been moved to debugging.js

// create a cutting mat background with grid lines and angle guides
function createCuttingMatBackground() {
    // create a background plane
    const bg = new THREE.Color(COLORS.background);
    planeGeometry = new THREE.PlaneGeometry(100, 100); // large enough to feel infinite
    planeMaterial = new THREE.MeshBasicMaterial({ 
        color: bg,
        side: THREE.DoubleSide
    });
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(plane);
    
    // create grid lines
    createGridLines();
    
    // create measurement markings
    // createMeasurementMarkings();
    
    // create angle guides (diagonal lines)
    // createAngleGuides();
}

// create grid lines
function createGridLines() {
    const gridSize = 100;       // size of the entire grid
    const majorGridStep = 1;    // spacing for major grid lines
    const minorGridStep = 0.1;  // spacing for minor grid lines
    
    // create grid material
    const majorGridMaterial = new THREE.LineBasicMaterial({ color: COLORS.majorGrid, transparent: true, opacity: 0.5 });
    const minorGridMaterial = new THREE.LineBasicMaterial({ color: COLORS.minorGrid, transparent: true, opacity: 0.3 });
    
    // major grid (1 unit spacing)
    const majorGridHelper = new THREE.GridHelper(gridSize, gridSize / majorGridStep, COLORS.majorGrid, COLORS.majorGrid);
    majorGridHelper.rotation.x = Math.PI / 2; // rotate to lie flat
    majorGridHelper.material = majorGridMaterial;
    scene.add(majorGridHelper);
    
    // minor grid (0.1 unit spacing)
    const minorGridHelper = new THREE.GridHelper(gridSize, gridSize / minorGridStep, COLORS.minorGrid, COLORS.minorGrid);
    minorGridHelper.rotation.x = Math.PI / 2; // rotate to lie flat
    minorGridHelper.material = minorGridMaterial;
    scene.add(minorGridHelper);
}

// BUG: IS NOT SEEN ON THE SCREEN!
// create measurement markings along the edges
function createMeasurementMarkings() {
    // we'll create line markings along the x and y axes
    const markingLength = 0.2;
    const markingMaterial = new THREE.LineBasicMaterial({ color: COLORS.white });
    
    // create markings along x-axis (bottom)
    for (let i = -50; i <= 50; i++) {
        if (i % 5 === 0) {
            // create longer markings for multiples of 5
            const heightMultiplier = 2;
            
            // create marking line
            const markingGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(i, -50, 0.01),
                new THREE.Vector3(i, -50 + (markingLength * heightMultiplier), 0.01)
            ]);
            
            const markingLine = new THREE.Line(markingGeometry, markingMaterial);
            scene.add(markingLine);
        } else {
            // create regular markings
            const markingGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(i, -50, 0.01),
                new THREE.Vector3(i, -50 + markingLength, 0.01)
            ]);
            
            const markingLine = new THREE.Line(markingGeometry, markingMaterial);
            scene.add(markingLine);
        }
    }
    
    // create markings along y-axis (left)
    for (let i = -50; i <= 50; i++) {
        if (i % 5 === 0) {
            // create longer markings for multiples of 5
            const widthMultiplier = 2;
            
            // create marking line
            const markingGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-50, i, 0.01),
                new THREE.Vector3(-50 + (markingLength * widthMultiplier), i, 0.01)
            ]);
            
            const markingLine = new THREE.Line(markingGeometry, markingMaterial);
            scene.add(markingLine);
        } else {
            // create regular markings
            const markingGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-50, i, 0.01),
                new THREE.Vector3(-50 + markingLength, i, 0.01)
            ]);
            
            const markingLine = new THREE.Line(markingGeometry, markingMaterial);
            scene.add(markingLine);
        }
    }
}

// BUG: IS NOT SEEN ON THE SCREEN!
// create angle guides (diagonal lines at 45° angles)
function createAngleGuides() {
    // create material for diagonal lines
    const diagonalMaterial = new THREE.LineBasicMaterial({ color: COLORS.white, transparent: true, opacity: 0.7 });
    
    // 45° diagonal from bottom-left to top-right
    const diagonal1Geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-50, -50, 0.01),
        new THREE.Vector3(50, 50, 0.01)
    ]);
    const diagonal1 = new THREE.Line(diagonal1Geometry, diagonalMaterial);
    scene.add(diagonal1);
    
    // 45° diagonal from top-left to bottom-right
    const diagonal2Geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-50, 50, 0.01),
        new THREE.Vector3(50, -50, 0.01)
    ]);
    const diagonal2 = new THREE.Line(diagonal2Geometry, diagonalMaterial);
    scene.add(diagonal2);
    
    // additional angle lines at 60° (as seen in the image)
    const diagonal60Geometry1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-50, -50 + 11.5, 0.01), // adjusted for 60° angle
        new THREE.Vector3(50, 50 + 11.5, 0.01)
    ]);
    const diagonal60_1 = new THREE.Line(diagonal60Geometry1, diagonalMaterial);
    scene.add(diagonal60_1);
    
    // angle label for 60°
    addLabel("60°", -25, -10, 0.02);
    
    // additional angle lines at 30° (as seen in the image)
    const diagonal30Geometry1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-30, -50, 0.01),
        new THREE.Vector3(50, -15, 0.01)
    ]);
    const diagonal30_1 = new THREE.Line(diagonal30Geometry1, diagonalMaterial);
    scene.add(diagonal30_1);
    
    // angle label for 30°
    addLabel("30°", 10, -35, 0.02);

    // add more angle guides as needed
}

// helper function to add text labels
function addLabel(text, x, y, z, options = {}) {
    // since three.textgeometry requires the font to be loaded first,
    // we'll use a simple alternative with a sprite-based approach
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = options.fontSize || 18;
    const textColor = options.color || COLORS.feedbackText;
    const width = options.width || 200;``
    const height = options.height || 100;
    
    canvas.width = width;
    canvas.height = height;
    
    context.font = `${fontSize}px Arial`;
    context.fillStyle = textColor;
    context.fillText(text, 10, fontSize + 10);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true 
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    
    // use provided scale or default
    const scaleX = options.scaleX || 1;
    const scaleY = options.scaleY || 1;
    sprite.scale.set(scaleX, scaleY, 1);
    
    scene.add(sprite);
    
    // return the sprite so we can reference it later
    return sprite;
}

// create author meshes (called from scripts.js)
function createAuthorMeshes(authors) {
    // track all author objects for interactivity
    const authorObjects = [];
    
    // define the region bounds for random placement
    const boxSize = 1.0;  // size of each author box
    const regionWidth = 8;  // width of the region to place boxes in
    const regionHeight = 6;  // height of the region to place boxes in
    const minDistance = 1.5; // minimum distance between box centers to prevent overlap
    
    // visualize the region if in development mode
    if (DEVELOPMENT && window.visualizeAuthorRegion) {
        // remove any existing visualizer
        if (window.removeAuthorRegionVisualizer) {
            window.removeAuthorRegionVisualizer();
        }
        // create new region visualizer
        window.updateRegionVisualizer = window.visualizeAuthorRegion(regionWidth, regionHeight);
    }
    
    // materials for the boxes (normal and hover states)
    const normalMaterial = new THREE.MeshBasicMaterial({ 
        color: COLORS.primary,
        transparent: true,
        opacity: 0.8
    });
    
    const hoverMaterial = new THREE.MeshBasicMaterial({ 
        color: COLORS.secondary,
        transparent: true,
        opacity: 0.8
    });
    
    // helper function to generate random position within our defined region
    function generateRandomPosition() {
        return {
            x: (Math.random() * regionWidth) - (regionWidth / 2),
            y: (Math.random() * regionHeight) - (regionHeight / 2)
        };
    }
    
    // helper function to check if a position is too close to existing boxes
    function isTooClose(position, existingPositions) {
        for (const existing of existingPositions) {
            const dx = position.x - existing.x;
            const dy = position.y - existing.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
                return true;
            }
        }
        return false;
    }
    
    // create a box and label for each author
    const existingPositions = [];
    authors.forEach((author, index) => {
        // find a random position that isn't too close to existing boxes
        let position;
        let attempts = 0;
        const maxAttempts = 50; // prevent infinite loops
        
        do {
            position = generateRandomPosition();
            attempts++;
        } while (isTooClose(position, existingPositions) && attempts < maxAttempts);
        
        existingPositions.push(position);
        
        const x = position.x;
        const y = position.y;
        const z = 0.1; // slightly above the background
        
        // create a box for this author with slight random rotation for visual interest
        const geometry = new THREE.BoxGeometry(boxSize, boxSize, 0.1);
        const mesh = new THREE.Mesh(geometry, normalMaterial.clone());
        mesh.position.set(x, y, z);
        
        // add slight random rotation for visual interest
        mesh.rotation.z = Math.random() * 0.2 - 0.1;
        scene.add(mesh);
        
        // add author name label below the box
        const labelText = author;
        const labelX = x;
        const labelY = y - boxSize/2 - 0.3; // place label below the box
        const labelZ = z + 0.05;
        
        // only add label if in development mode
        if (DEVELOPMENT) {
            const label = addLabel(labelText, labelX, labelY, labelZ, {
            fontSize: 30,
            color: COLORS.labelText, 
            scaleX: 1,
            scaleY: 1
            });

            // store reference to both mesh and label
            authorObjects.push({
            mesh,
            label,
            position: new THREE.Vector3(x, y, z),
            author
            });
        } else {
            // store reference to just the mesh when not in development
            authorObjects.push({
            mesh,
            position: new THREE.Vector3(x, y, z),
            author
            });
        }
    });
    
    // add click event listener to the document
    document.addEventListener('click', onDocumentClick);
    
    // add raycaster for interactivity
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // handle mouse move for hover effects
    document.addEventListener('mousemove', (event) => {
        // convert mouse position to normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // update the raycaster
        raycaster.setFromCamera(mouse, camera);
        
        // check for intersections
        const intersects = raycaster.intersectObjects(authorObjects.map(obj => obj.mesh));
        
        // reset all materials first
        authorObjects.forEach(obj => {
            obj.mesh.material.color.set(COLORS.primary);
        });
        
        // change material color if hovering
        if (intersects.length > 0) {
            intersects[0].object.material.color.set(COLORS.secondary);
            document.body.style.cursor = 'pointer';
        } else {
            // set grab cursor for the panning area, but only when not dragging
            document.body.style.cursor = isDragging ? 'grabbing' : 'grab';
        }
    });
    
    // handle click on author boxes
    function onDocumentClick(event) {
        // don't process click if we were just dragging (to avoid accidental clicks)
        if (isDragging || Math.abs(event.clientX - previousMousePosition.x) > 5 || 
            Math.abs(event.clientY - previousMousePosition.y) > 5) {
            return;
        }
        
        // convert mouse position to normalized device coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // update the raycaster
        raycaster.setFromCamera(mouse, camera);
        
        // check for intersections
        const intersects = raycaster.intersectObjects(authorObjects.map(obj => obj.mesh));
        
        if (intersects.length > 0) {
            // find the clicked author
            const clickedMesh = intersects[0].object;
            const clickedAuthor = authorObjects.find(obj => obj.mesh === clickedMesh);
            
            if (clickedAuthor) {
                console.log(`Author clicked: ${clickedAuthor.author}`);
                // you can add more functionality here, like filtering articles
                // by this author or displaying author information
                
                // example: trigger a custom event that scripts.js can listen for
                const authorClickEvent = new CustomEvent('authorClick', {
                    detail: { author: clickedAuthor.author }
                });
                document.dispatchEvent(authorClickEvent);
            }
        }
    }
    
    // return the author objects for reference elsewhere if needed
    return authorObjects;
}

// handle mouse movement
function onDocumentMouseMove(event) {
    // store the mouse position
    mouseX = event.clientX;
    mouseY = event.clientY;
    
    // handle drag-based panning
    if (isDragging) {
        // calculate movement
        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };
        
        // update target position (negative because we move camera in opposite direction)
        targetX -= deltaMove.x * dragSensitivity;
        targetY += deltaMove.y * dragSensitivity; // Y is inverted in three.js
        
        // update previous position
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
        
        // when dragging, we don't want edge-based panning to interfere
        isPanning = false;
        return;
    }
    
    // check if mouse is in the edge trigger areas
    isPanning = false;
    panDirection = { x: 0, y: 0 };
    panSpeed = 0;
    
    // check left edge
    if (mouseX < edgeTriggerSize) {
        isPanning = true;
        panDirection.x = -1;
        // calculate speed based on how close to the edge (0 at trigger boundary, max at screen edge)
        panSpeed = maxPanSpeed * (1 - mouseX / edgeTriggerSize);
    }
    // check right edge
    else if (mouseX > window.innerWidth - edgeTriggerSize) {
        isPanning = true;
        panDirection.x = 1;
        panSpeed = maxPanSpeed * (1 - (window.innerWidth - mouseX) / edgeTriggerSize);
    }
    
    // check top edge
    if (mouseY < edgeTriggerSize) {
        isPanning = true;
        panDirection.y = 1; // positive is up in three.js
        panSpeed = maxPanSpeed * (1 - mouseY / edgeTriggerSize);
    }
    // check bottom edge
    else if (mouseY > window.innerHeight - edgeTriggerSize) {
        isPanning = true;
        panDirection.y = -1; // negative is down in three.js
        panSpeed = maxPanSpeed * (1 - (window.innerHeight - mouseY) / edgeTriggerSize);
    }
}

// handle mouse down for drag-based panning
function onMouseDown(event) {
    // only enable dragging with left mouse button
    if (event.button !== 0) return;
    
    // store initial position
    isDragging = true;
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
    
    // change cursor to indicate dragging
    document.body.style.cursor = 'grabbing';
}

// handle mouse up to end dragging
function onMouseUp() {
    isDragging = false;
    
    // restore default cursor or pointer if hovering over an interactive element
    document.body.style.cursor = 'default';
}

// handle double tap for mobile centering
let lastTap = 0;
let tapTimeout;

function onTouchStart(event) {
    // prevent default to avoid page scrolling/zooming while interacting
    event.preventDefault();
    
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    // detect double tap (less than 300ms between taps)
    if (tapLength < 300 && tapLength > 0) {
        // double tap detected, center the camera
        clearTimeout(tapTimeout);
        centerCamera();
    } else {
        // single tap - set timer to detect if it becomes a double tap
        tapTimeout = setTimeout(() => {
            // this was a single tap - continue with normal behavior
            
            if (event.touches.length === 1) {
                // single touch - panning
                isDragging = true;
                previousMousePosition = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY
                };
            } 
            else if (event.touches.length === 2) {
                // two touches - pinch zoom
                isDragging = false;
                initialPinchDistance = getPinchDistance(event);
            }
        }, 300); // wait for double tap window
    }
    
    // update last tap time
    lastTap = currentTime;
}

// calculate distance between two touch points
function getPinchDistance(event) {
    return Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
    );
}

// handle touch move for mobile panning and pinch-zoom
function onTouchMove(event) {
    // prevent default to avoid page scrolling/zooming while interacting
    event.preventDefault();
    
    if (event.touches.length === 1 && isDragging) {
        // single touch - panning
        // calculate movement
        const deltaMove = {
            x: event.touches[0].clientX - previousMousePosition.x,
            y: event.touches[0].clientY - previousMousePosition.y
        };
        
        // update target position (negative because we move camera in opposite direction)
        targetX -= deltaMove.x * dragSensitivity;
        targetY += deltaMove.y * dragSensitivity; // Y is inverted in three.js
        
        // update previous position
        previousMousePosition = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
    } 
    else if (event.touches.length === 2) {
        // two touches - pinch zoom
        const currentPinchDistance = getPinchDistance(event);
        const pinchRatio = currentPinchDistance / initialPinchDistance;
        
        // calculate new target scale
        const newScale = currentScale * pinchRatio;
        
        // clamp scale to min and max values
        targetScale = Math.min(Math.max(newScale, minScale), maxScale);
        
        // update initial distance for next move event
        initialPinchDistance = currentPinchDistance;
        
        // get the midpoint of the two touches
        const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
        const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
        
        // convert midpoint to normalized device coordinates
        const midPoint = {
            x: (midX / window.innerWidth) * 2 - 1,
            y: -(midY / window.innerHeight) * 2 + 1
        };
        
        // use this as the center of zoom (not implemented yet)
        // this would require additional code to apply zoom towards this point
    }
}

// handle touch end to stop mobile panning and pinching
function onTouchEnd(event) {
    if (event.touches.length === 0) {
        isDragging = false;
        // save the current scale as our new base
        currentScale = targetScale;
    } 
    else if (event.touches.length === 1) {
        // went from pinch to single touch
        isDragging = true;
        previousMousePosition = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
        // save the current scale
        currentScale = targetScale;
    }
}

// handle mouse wheel for zooming
function onMouseWheel(event) {
    // prevent default scrolling
    event.preventDefault();
    
    // normalize wheel delta across browsers
    const delta = event.deltaY;
    
    // calculate zoom factor (smaller delta for smoother zooming)
    const zoomFactor = 0.05;
    
    // update target scale based on wheel direction
    if (delta > 0) {
        // zoom out
        targetScale = Math.max(targetScale - zoomFactor, minScale);
    } else {
        // zoom in
        targetScale = Math.min(targetScale + zoomFactor, maxScale);
    }
    
    // Record current mouse position for potential future features
    // like zooming towards the cursor position
    const mousePos = {
        x: event.clientX,
        y: event.clientY
    };
    
    // In a more advanced implementation, we could use mousePos to zoom
    // toward the cursor position rather than the center of the screen
}

// handle window resize
function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    
    const aspectRatio = window.innerWidth / window.innerHeight;
    const cameraWidth = 10 / targetScale; // account for zoom level
    const cameraHeight = cameraWidth / aspectRatio;
    
    camera.left = -cameraWidth / 2;
    camera.right = cameraWidth / 2;
    camera.top = cameraHeight / 2;
    camera.bottom = -cameraHeight / 2;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // redraw trigger areas if in development mode
    if (DEVELOPMENT && window.drawTriggerAreas) {
        window.drawTriggerAreas();
    }
}

// handle key down for keyboard shortcuts
function onKeyDown(event) {
    // 'C' key to center the camera
    if (event.key === 'c' || event.key === 'C') {
        centerCamera();
    }
}

// animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // panning logic - when mouse is near the edges
    if (isPanning) {
        // update target position based on pan direction and speed
        targetX += panDirection.x * panSpeed;
        targetY += panDirection.y * panSpeed;
    }
    
    // apply region panning limits if enabled
    if (panBoundaries.enabled) {
        // calculate effective boundaries based on current zoom level
        // as we zoom out, the boundaries need to shrink since the camera can see more area
        const zoomFactor = 1 / targetScale;
        const effectiveMinX = panBoundaries.minX * zoomFactor;
        const effectiveMaxX = panBoundaries.maxX * zoomFactor;
        const effectiveMinY = panBoundaries.minY * zoomFactor;
        const effectiveMaxY = panBoundaries.maxY * zoomFactor;
        
        // clamp target position to boundaries
        targetX = Math.max(effectiveMinX, Math.min(targetX, effectiveMaxX));
        targetY = Math.max(effectiveMinY, Math.min(targetY, effectiveMaxY));
    }
    
    // smooth camera movement
    camera.position.x += (targetX - camera.position.x) * moveSpeed;
    camera.position.y += (targetY - camera.position.y) * moveSpeed;
    
    // apply zoom (scale) to the camera
    const aspectRatio = window.innerWidth / window.innerHeight;
    const cameraWidth = 10 / targetScale; // divide by scale to zoom in/out
    const cameraHeight = cameraWidth / aspectRatio;
    
    // smoothly update camera orthographic settings
    camera.left += ((-cameraWidth / 2) - camera.left) * zoomSpeed;
    camera.right += ((cameraWidth / 2) - camera.right) * zoomSpeed;
    camera.top += ((cameraHeight / 2) - camera.top) * zoomSpeed;
    camera.bottom += ((-cameraHeight / 2) - camera.bottom) * zoomSpeed;
    camera.updateProjectionMatrix();
    
    // render scene
    renderer.render(scene, camera);
    
    // draw development visuals if enabled
    if (DEVELOPMENT) {
        // update edge trigger visualizers
        if (window.drawTriggerAreas) {
            window.drawTriggerAreas();
        }
        
        // update author region visualizer
        if (window.updateRegionVisualizer) {
            window.updateRegionVisualizer(camera, renderer);
        }
        
        // update pan boundaries visualizer
        if (window.updatePanBoundaryVisualizer) {
            window.updatePanBoundaryVisualizer(camera, renderer);
        }
    }
}

// Note: drawTriggerAreas and createTriggerVisualizer have been moved to debugging.js

// expose functions to global scope
window.initThreeJS = initThreeJS;
window.createAuthorMeshes = createAuthorMeshes;
window.centerCamera = centerCamera;
window.centerCamera = centerCamera;