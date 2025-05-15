// three js file

// global variables
let scene, camera, renderer;
let planeGeometry, planeMaterial, plane;
let mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let targetX = 0, targetY = 0;
const moveSpeed = 0.05; // adjust this for panning sensitivity

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
    renderer.setClearColor(0x000000, 0); // transparent background
    
    // append to dom
    const container = document.getElementById('background-canvas');
    container.appendChild(renderer.domElement);
    
    // add event listeners
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    window.addEventListener('resize', onWindowResize, false);
    
    // create cutting mat background
    createCuttingMatBackground();
    
    // start animation
    animate();
}

// create a cutting mat background with grid lines and angle guides
function createCuttingMatBackground() {
    // create a dark gray background plane
    const darkGray = new THREE.Color(0x333333);
    planeGeometry = new THREE.PlaneGeometry(100, 100); // large enough to feel infinite
    planeMaterial = new THREE.MeshBasicMaterial({ 
        color: darkGray,
        side: THREE.DoubleSide
    });
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(plane);
    
    // create grid lines
    createGridLines();
    
    // create measurement markings
    createMeasurementMarkings();
    
    // create angle guides (diagonal lines)
    createAngleGuides();
}

// create grid lines
function createGridLines() {
    const gridSize = 100;  // size of the entire grid
    const majorGridStep = 1;  // spacing for major grid lines
    const minorGridStep = 0.1; // spacing for minor grid lines
    
    // create grid material
    const majorGridMaterial = new THREE.LineBasicMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.5 });
    const minorGridMaterial = new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.3 });
    
    // major grid (1 unit spacing)
    const majorGridHelper = new THREE.GridHelper(gridSize, gridSize / majorGridStep, 0xbbbbbb, 0xbbbbbb);
    majorGridHelper.rotation.x = Math.PI / 2; // rotate to lie flat
    majorGridHelper.material = majorGridMaterial;
    scene.add(majorGridHelper);
    
    // minor grid (0.1 unit spacing)
    const minorGridHelper = new THREE.GridHelper(gridSize, gridSize / minorGridStep, 0x999999, 0x999999);
    minorGridHelper.rotation.x = Math.PI / 2; // rotate to lie flat
    minorGridHelper.material = minorGridMaterial;
    scene.add(minorGridHelper);
}

// create measurement markings along the edges
function createMeasurementMarkings() {
    // we'll create line markings along the x and y axes
    const markingLength = 0.2;
    const markingMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    
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

// create angle guides (diagonal lines at 45° angles)
function createAngleGuides() {
    // create material for diagonal lines
    const diagonalMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    
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
function addLabel(text, x, y, z) {
    // since THREE.TextGeometry requires the font to be loaded first,
    // we'll use a simple alternative with a sprite-based approach
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 40;
    canvas.width = 200;
    canvas.height = 100;
    
    context.font = `${fontSize}px Arial`;
    context.fillStyle = 'white';
    context.fillText(text, 10, 50);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(5, 2.5, 1); // adjust scale as needed
    
    scene.add(sprite);
}

// create author meshes (placeholder function called from scripts.js)
function createAuthorMeshes(authors) {
    // this function can be implemented later to add author-related elements to the scene
    // for now, it's just a placeholder
}

// handle mouse movement
function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) / 100;
    mouseY = (event.clientY - windowHalfY) / 100;
}

// handle window resize
function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    
    const aspectRatio = window.innerWidth / window.innerHeight;
    const cameraWidth = 10;
    const cameraHeight = cameraWidth / aspectRatio;
    
    camera.left = -cameraWidth / 2;
    camera.right = cameraWidth / 2;
    camera.top = cameraHeight / 2;
    camera.bottom = -cameraHeight / 2;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // smooth camera movement
    targetX += (mouseX - targetX) * moveSpeed;
    targetY += (mouseY - targetY) * moveSpeed;
    
    // pan camera with mouse
    camera.position.x = targetX;
    camera.position.y = targetY;
    
    renderer.render(scene, camera);
}

// expose functions to global scope
window.initThreeJS = initThreeJS;
window.createAuthorMeshes = createAuthorMeshes;