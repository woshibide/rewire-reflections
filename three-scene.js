let DEVELOPMENT = false;

// global variables
let scene, camera, renderer;
let planeGeometry, planeMaterial, plane;
let mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let targetX = 0, targetY = 0;
// global variable to store author objects for filter opacity updates
let authorObjects = [];

// color palette for easy customization of the 3d canvas
const COLORS = {
    // ui colors
    primary: 0xBFF205,         // blue - used for author boxes normal state
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

const moveSpeed = 0.15;             // panning sensitivity
const edgeTriggerSize = 20;         // size in pixels of the edge trigger area for panning
let isPanning = false;              // if we're currently panning
let panDirection = { x: 0, y: 0 };  // direction of panning
let panSpeed = 0;                   // current panning speed
const maxPanSpeed = 0.15;            // maximum panning speed

// mouse drag panning variables
let isDragging = false;             // if we're currently dragging the scene
let previousMousePosition = { x: 0, y: 0 };
let dragSensitivity = 0.01;         // how sensitive the drag panning is

// pinch-to-zoom variables
let initialPinchDistance = 0;       // initial distance between two touch points
let currentScale = 1;               // current zoom scale
let targetScale = 1;                // target zoom scale - will be repurposed for perspective zoom if needed
let zoomSpeed = 0.5;                // how fast to zoom
let minScale = 0.5;                 // minimum zoom level - will be repurposed
let maxScale = 3;                   // maximum zoom level - will be repurposed

// epic shot view state
let isEpicShotViewActive = false;
// default camera perspective settings
const defaultFOV = 40;
const defaultCameraPosition = new THREE.Vector3(0, 0, 10); // z higher for a more top-down feel
const defaultLookAt = new THREE.Vector3(0, 0, 0);

// epic shot camera settings
const epicShotFOV = 120;
const epicShotOffset = new THREE.Vector3(0, -1.2, 0); // X, Y, Z

// animation parameters
let animationParams = {
    active: false,
    startTime: 0,
    duration: 900, // slightly longer for smoother feel
    sourcePos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    sourceLookAt: new THREE.Vector3(),
    targetLookAt: new THREE.Vector3(),
    sourceFov: defaultFOV,
    targetFov: defaultFOV
};

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
    isEpicShotViewActive = false; // ensure we are exiting epic shot mode

    animationParams.active = true;
    animationParams.startTime = Date.now();
    animationParams.sourcePos.copy(camera.position);
    // calculate current lookat point based on camera's current direction
    const currentDirection = camera.getWorldDirection(new THREE.Vector3());
    animationParams.sourceLookAt.copy(camera.position).add(currentDirection.multiplyScalar(camera.position.distanceTo(animationParams.targetLookAt))); // estimate current lookat
    animationParams.sourceFov = camera.fov;

    // target default top-down perspective view
    // if we want to return to a panned xy, use targetx, targety
    animationParams.targetPos.set(targetX, targetY, defaultCameraPosition.z);
    animationParams.targetLookAt.set(targetX, targetY, 0); // look at the panned xy on the z=0 plane
    animationParams.targetFov = defaultFOV;

    // log camera position (using lowercase for comments as per instruction)
    console.log("camera centering to position:", animationParams.targetPos, "looking at:", animationParams.targetLookAt);
}

// initialize the three.js scene
function initThreeJS() {
    // create scene
    scene = new THREE.Scene();

    // create camera (always perspective)
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(defaultFOV, aspectRatio, 0.1, 1000);
    camera.position.copy(defaultCameraPosition);
    camera.lookAt(defaultLookAt);

    // initialize panning targets to current camera's xy projection on z=0 plane
    targetX = camera.position.x;
    targetY = camera.position.y;

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

function focusOnObject(targetObject) {
    isEpicShotViewActive = true;
    animationParams.active = true;
    animationParams.startTime = Date.now();

    animationParams.sourcePos.copy(camera.position);
    const currentDirection = camera.getWorldDirection(new THREE.Vector3());
    // estimate current lookat: take a point in front of camera, at distance similar to current target or default
    let estDist = defaultLookAt.distanceTo(camera.position);
    if (animationParams.targetLookAt) { // if a previous targetlookat exists
        estDist = animationParams.targetLookAt.distanceTo(camera.position);
    }
    animationParams.sourceLookAt.copy(camera.position).add(currentDirection.multiplyScalar(estDist));
    animationParams.sourceFov = camera.fov;

    // use the global epicshotoffset for camera positioning
    animationParams.targetPos.copy(targetObject.position).add(epicShotOffset);

    animationParams.targetLookAt.copy(targetObject.position);
    animationParams.targetFov = epicShotFOV;
}

// create a cutting mat background with grid lines and angle guides
function createCuttingMatBackground() {
    // create a background plane
    const bg = new THREE.Color(COLORS.background);
    planeMaterial = new THREE.MeshBasicMaterial({ 
        color: bg,
        side: THREE.DoubleSide
    });
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(plane);
    
    // create grid lines
    createGridLines();
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

// create author meshes (called from scripts.js)
function createAuthorMeshes(authors) {
    // track all author objects for interactivity
    authorObjects = [];
    
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
    
    // no need for CSS transitions, we'll use THREE.js animations
    
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
        const z = boxSize * 2; // slightly above the background
        
        // create a box for this author with slight random rotation for visual interest
        const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize * 2);
        const mesh = new THREE.Mesh(geometry, normalMaterial.clone());
        mesh.position.set(x, y, z);
        
        // add slight random rotation for visual interest
        mesh.rotation.z = Math.random() * 0.8 - 0.1;
        scene.add(mesh);
        
        // add author name label below the box
        const labelText = author;
        const labelX = x;
        const labelY = y - boxSize/2 - 0.3; // place label below the box
        const labelZ = z + 0.05;
        
        // only add label if in development mode
        if (DEVELOPMENT && window.addLabel) { // ensure window.addlabel exists
            const label = window.addLabel(scene, labelText, labelX, labelY, labelZ, { // call window.addlabel and pass scene
            fontSize: 30, // this is pixels for canvas texture
            color: COLORS.labelText, 
            visualHeight: 0.15, // desired visual height in world units
            // scalex and scaley are now calculated internally by addlabel based on visualheight
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
        if (animationParams.active || isDragging || Math.abs(event.clientX - previousMousePosition.x) > 5 || 
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
                
                // switch to perspective camera and focus on the clicked mesh
                focusOnObject(clickedMesh);
                
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

// function to update author meshes opacity based on filtered authors
function updateAuthorOpacity(filteredAuthors = null) {
    const DEFAULT_OPACITY = 0.8;
    const FADED_OPACITY = 0.2;
    const TRANSITION_DURATION = 500; // ms
    
    // if no filtered authors, show all author meshes at full opacity
    if (!filteredAuthors || filteredAuthors.length === 0) {
        authorObjects.forEach(obj => {
            // create a smooth transition
            const startOpacity = obj.mesh.material.opacity;
            const endOpacity = DEFAULT_OPACITY;
            
            const startTime = Date.now();
            
            // create animation function
            function animateOpacity() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
                
                obj.mesh.material.opacity = startOpacity + (endOpacity - startOpacity) * progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animateOpacity);
                }
            }
            
            // start animation
            animateOpacity();
        });
        return;
    }
    
    // get list of author names from the filtered articles
    let filteredAuthorNames = [];
    
    // handle potential multiple authors in a single author field (e.g., "Author1 + Author2")
    filteredAuthors.forEach(article => {
        const authorField = article.author;
        if (authorField.includes('+')) {
            // split multiple authors
            const authors = authorField.split('+').map(name => name.trim());
            filteredAuthorNames = filteredAuthorNames.concat(authors);
        } else {
            filteredAuthorNames.push(authorField);
        }
    });
    
    // update opacity for each author box with smooth transition
    authorObjects.forEach(obj => {
        // determine target opacity
        const targetOpacity = filteredAuthorNames.includes(obj.author) ? DEFAULT_OPACITY : FADED_OPACITY;
        
        // create a smooth transition
        const startOpacity = obj.mesh.material.opacity;
        const endOpacity = targetOpacity;
        
        const startTime = Date.now();
        
        // create animation function
        function animateOpacity() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
            
            obj.mesh.material.opacity = startOpacity + (endOpacity - startOpacity) * progress;
            
            if (progress < 1) {
                requestAnimationFrame(animateOpacity);
            }
        }
        
        // start animation
        animateOpacity();
    });
}

// expose the function to global scope
window.updateAuthorOpacity = updateAuthorOpacity;

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
    // allow scrolling if the mouse is over an article-text element
    if (event.target.closest && event.target.closest('.article-text')) {
        // do not prevent default, let the browser scroll the text
        return;
    }
    // prevent default scrolling
    event.preventDefault();

    if (animationParams.active) return; // do not zoom while animating
    // normalize wheel delta across browsers
    const delta = event.deltaY;

    // epic shot view zoom handling
    if (isEpicShotViewActive) {
        const buffer = 0.1 * (epicShotFOV - defaultFOV);
        const exitFovThreshold = epicShotFOV - buffer;
        const minFov = defaultFOV;
        const maxFov = epicShotFOV;
        // scroll down (delta > 0) should zoom out (increase fov)
        if (delta > 0) {
            camera.fov = Math.min(camera.fov + zoomSpeed * 0.5, maxFov);
            camera.updateProjectionMatrix();
            // exit epic shot view if zoomed out beyond threshold
            if (camera.fov >= exitFovThreshold) {
                isEpicShotViewActive = false;
                camera.fov = defaultFOV;
                camera.updateProjectionMatrix();
            }
        }
        // scroll up (delta < 0) should zoom in (decrease fov)
        else if (delta < 0) {
            camera.fov = Math.max(camera.fov - zoomSpeed * 0.5, minFov);
            camera.updateProjectionMatrix();
        }
        return;
    } else {
        const zoomSensitivity = 0.005; // sensitivity for proportional zoom
        const lookAtPoint = new THREE.Vector3(targetX, targetY, 0);
        let currentDistance = camera.position.distanceTo(lookAtPoint);

        const minZoomDist = 1.5; // minimum distance to the look-at point
        const maxZoomDist = 30;  // maximum distance from the look-at point

        // if camera is at (or extremely close to) the lookatpoint
        if (currentDistance < 0.01) {
            if (event.deltaY > 0) { // trying to zoom out (scroll down) from the point
                // move camera along its view direction (away from lookatpoint) to minzoomdist
                let moveDir = camera.getWorldDirection(new THREE.Vector3()).negate(); // vector from lookatpoint to camera
                if (moveDir.lengthSq() < 0.001) { // if camera has no defined direction (e.g. at origin, looking at origin)
                    moveDir.set(0, 0, 0); // use a default upward direction
                }
                camera.position.copy(lookAtPoint).add(moveDir.normalize().multiplyScalar(minZoomDist));
                camera.lookAt(lookAtPoint);
            }
            // if trying to zoom in while already at the point, do nothing
            return;
        }

        // calculate movefactor for camera movement along its view direction:
        // positive movefactor means zoom in (move camera forward, scroll up, event.deltay < 0)
        // negative movefactor means zoom out (move camera backward, scroll down, event.deltay > 0)
        // movefactor is proportional to currentdistance for consistent zoom feel
        
        let effectiveDistanceForSensitivity;
        // if currentdistance is very small (but not zero), use 1.0 for sensitivity.
        // this implies currentdistance >= 0.001 due to the preceding 'if' block's 'return'.
        if (currentDistance < 1.0) { 
            effectiveDistanceForSensitivity = 10.0;
        } else { // currentdistance >= 1.0
            effectiveDistanceForSensitivity = currentDistance;
        }

        // invert event.deltay effect: scroll down (positive delta) should zoom out (negative movefactor)
        let moveFactor = -event.deltaY * zoomSensitivity * effectiveDistanceForSensitivity;
        
        const direction = camera.getWorldDirection(new THREE.Vector3()); // normalized direction camera is looking
        // if movefactor is positive (zoom in), add to position along direction.
        // if movefactor is negative (zoom out), subtract from position along direction (effectively add(direction * negative_val)).
        const newPosCandidate = camera.position.clone().add(direction.multiplyScalar(moveFactor));

        // vector from lookatpoint to the new candidate position
        const vecFromLookAtToCandidate = newPosCandidate.clone().sub(lookAtPoint);
        let distCandidate = vecFromLookAtToCandidate.length();

        if (distCandidate < 0.001) { // candidate landed exactly on the lookatpoint
            // this can happen if movefactor was exactly -currentdistance along view direction.
            // place camera at minzoomdist along the original view line.
            let dir = camera.getWorldDirection(new THREE.Vector3()).negate(); // original vector from lookatpoint to camera
            if(dir.lengthSq() < 0.001) dir.set(0,0,1); // default if no direction
            camera.position.copy(lookAtPoint).add(dir.normalize().multiplyScalar(minZoomDist));
        } else {
            // clamp the distance of the candidate position
            const clampedDistance = Math.max(minZoomDist, Math.min(maxZoomDist, distCandidate));
            // set camera to the new clamped position
            camera.position.copy(lookAtPoint).add(vecFromLookAtToCandidate.normalize().multiplyScalar(clampedDistance));
        }
        
        camera.lookAt(lookAtPoint); // ensure camera continues to look at the target
    }
}

// handle window resize
function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    // redraw trigger areas if in development mode
    if (DEVELOPMENT && window.drawTriggerAreas) {
        window.drawTriggerAreas();
    }
}

// animation loop
function animate() {
    requestAnimationFrame(animate);

    if (animationParams.active) {
        const progress = Math.min((Date.now() - animationParams.startTime) / animationParams.duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4); // easeoutquart

        camera.position.lerpVectors(animationParams.sourcePos, animationParams.targetPos, easeProgress);
        
        const currentLookAt = new THREE.Vector3().lerpVectors(animationParams.sourceLookAt, animationParams.targetLookAt, easeProgress);
        camera.lookAt(currentLookAt);

        camera.fov = animationParams.sourceFov + (animationParams.targetFov - animationParams.sourceFov) * easeProgress;
        camera.updateProjectionMatrix();

        if (progress >= 1) {
            animationParams.active = false;
            camera.position.copy(animationParams.targetPos); // ensure final state
            camera.lookAt(animationParams.targetLookAt);
            camera.fov = animationParams.targetFov;
            camera.updateProjectionMatrix();
            if (!isEpicShotViewActive) { // if we animated back to default view
                targetX = camera.position.x; // update panning targets
                targetY = camera.position.y;
                 // ensure lookat is on the z=0 plane for default view after animation
                camera.lookAt(targetX, targetY, 0);
            }
        }
    } else { // not animating, handle panning and dragging
        if (!isEpicShotViewActive) {
            if (isPanning) {
                // simple world-space panning for top-down like view
                targetX += panDirection.x * panSpeed;
                targetY += panDirection.y * panSpeed;
            }
            if (isDragging) {
                // this needs to be adapted for perspective if not already
                // current drag logic updates targetx, targety directly
            }

            // apply region panning limits if enabled
            if (panBoundaries.enabled) {
                // perspective zoom affects how much you can pan. this might need adjustment.
                // for now, using existing boundary logic with targetx, targety
                const effectiveMinX = panBoundaries.minX; 
                const effectiveMaxX = panBoundaries.maxX;
                const effectiveMinY = panBoundaries.minY;
                const effectiveMaxY = panBoundaries.maxY;

                targetX = Math.max(effectiveMinX, Math.min(targetX, effectiveMaxX));
                targetY = Math.max(effectiveMinY, Math.min(targetY, effectiveMaxY));
            }

            // smooth camera movement towards targetx, targety
            // z position is handled by zoom logic or animation
            camera.position.x += (targetX - camera.position.x) * moveSpeed;
            camera.position.y += (targetY - camera.position.y) * moveSpeed;
            
            // always look at the targetxy plane for default view
            camera.lookAt(targetX, targetY, 0);
        }
        // if isEpicShotViewActive and not animating, camera is static or user-zoomed (fov)
    }

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

// expose functions to global scope
window.initThreeJS = initThreeJS;
window.createAuthorMeshes = createAuthorMeshes;
window.centerCamera = centerCamera;