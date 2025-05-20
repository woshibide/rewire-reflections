// set to true to show the work in progress overlay
const SHOW_WIP_OVERLAY = true;

// initialize trigger areas visualization if in development mode
function initTriggerAreas(development) {
    if (development) {
        // add css for trigger areas and debug visualizations
        const style = document.createElement('style');
        style.textContent = `
            .trigger-area-visualizer,
            .region-visualizer {
                opacity: 0.3;
                transition: opacity 0.2s ease-in-out;
            }
            .trigger-area-visualizer:hover,
            .region-visualizer:hover {
                opacity: 0.6;
            }
            .trigger-area-visualizer div,
            .region-visualizer div {
                /* style for labels */
                font-size: 10px;
                letter-spacing: -0.5px;
            }
        `;
        document.head.appendChild(style);
        
        // draw the trigger areas
        drawTriggerAreas();

        // create panning debug controls
        createPanningDebugControls();
    }
}

// function to draw trigger areas for development purposes
function drawTriggerAreas() {
    // remove existing trigger visualizations if any
    const existingVisualizers = document.querySelectorAll('.trigger-area-visualizer');
    existingVisualizers.forEach(el => el.remove());
    
    // create trigger area visualizers
    const leftTrigger = createTriggerVisualizer('left', 0, 0, edgeTriggerSize, window.innerHeight);
    const rightTrigger = createTriggerVisualizer('right', window.innerWidth - edgeTriggerSize, 0, edgeTriggerSize, window.innerHeight);
    const topTrigger = createTriggerVisualizer('top', 0, 0, window.innerWidth, edgeTriggerSize);
    const bottomTrigger = createTriggerVisualizer('bottom', 0, window.innerHeight - edgeTriggerSize, window.innerWidth, edgeTriggerSize);
    
    // append to body
    document.body.appendChild(leftTrigger);
    document.body.appendChild(rightTrigger);
    document.body.appendChild(topTrigger);
    document.body.appendChild(bottomTrigger);
}

// helper function to create a trigger area visualizer
function createTriggerVisualizer(position, left, top, width, height) {
    const visualizer = document.createElement('div');
    visualizer.className = 'trigger-area-visualizer trigger-area-visualizer-base'; // use base class
    visualizer.style.left = `${left}px`;
    visualizer.style.top = `${top}px`;
    visualizer.style.width = `${width}px`;
    visualizer.style.height = `${height}px`;
    
    // add label to show direction
    const label = document.createElement('div');
    label.className = 'trigger-area-label'; // use class for label styles
    label.textContent = `panning: ${position}`;
    
    // position the label based on the trigger area position
    switch (position) {
        case 'left':
            label.style.top = '50%';
            label.style.left = '5px';
            break;
        case 'right':
            label.style.top = '50%';
            label.style.right = '5px';
            break;
        case 'top':
            label.style.top = '5px';
            label.style.left = '50%';
            label.style.transform = 'translateX(-50%)';
            break;
        case 'bottom':
            label.style.bottom = '5px';
            label.style.left = '50%';
            label.style.transform = 'translateX(-50%)';
            break;
    }
    
    visualizer.appendChild(label);
    return visualizer;
}

// function to visualize the author placement region in 3d space
function visualizeAuthorRegion(regionWidth, regionHeight) {
    // convert 3d world units to screen coordinates
    // we need to use the three.js camera to project the region bounds onto the screen
    
    // create a DOM element to represent the region
    const regionVisualizer = document.createElement('div');
    regionVisualizer.className = 'region-visualizer author-region-visualizer-base'; // use base class
    regionVisualizer.id = 'author-region-visualizer';
    
    // add label
    const label = document.createElement('div');
    label.className = 'author-region-label'; // use class for label styles
    label.textContent = `author placement region: ${regionWidth}x${regionHeight} units`;
    regionVisualizer.appendChild(label);
    
    document.body.appendChild(regionVisualizer);
    
    // this function will be called from the animation loop to update the region visualizer position
    function updateRegionVisualizerPosition(camera, renderer) {
        if (!regionVisualizer) return;
        
        // define the corners of the region in 3d space
        const halfWidth = regionWidth / 2;
        const halfHeight = regionHeight / 2;
        const corners3D = [
            new THREE.Vector3(-halfWidth, -halfHeight, 0.1),
            new THREE.Vector3(halfWidth, -halfHeight, 0.1),
            new THREE.Vector3(halfWidth, halfHeight, 0.1),
            new THREE.Vector3(-halfWidth, halfHeight, 0.1)
        ];
        
        // project corners to screen space
        const corners2D = corners3D.map(corner => {
            const vector = corner.clone();
            vector.project(camera);
            
            return {
                x: (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth,
                y: (-(vector.y * 0.5) + 0.5) * renderer.domElement.clientHeight
            };
        });
        
        // get bounding box in screen space
        const minX = Math.min(...corners2D.map(c => c.x));
        const minY = Math.min(...corners2D.map(c => c.y));
        const maxX = Math.max(...corners2D.map(c => c.x));
        const maxY = Math.max(...corners2D.map(c => c.y));
        
        // update visualizer position and size
        regionVisualizer.style.left = `${minX}px`;
        regionVisualizer.style.top = `${minY}px`;
        regionVisualizer.style.width = `${maxX - minX}px`;
        regionVisualizer.style.height = `${maxY - minY}px`;
    }
    
    // return the update function so it can be called from the animation loop
    return updateRegionVisualizerPosition;
}

// function to visualize region panning boundaries
function visualizePanBoundaries() {
    // create a container for the boundaries visualization
    const boundaryVisualizer = document.createElement('div');
    boundaryVisualizer.id = 'pan-boundary-visualizer';
    boundaryVisualizer.className = 'region-visualizer pan-boundary-visualizer-base'; // use base class
    
    // add label
    const label = document.createElement('div');
    label.className = 'pan-boundary-label'; // use class for label styles
    label.textContent = 'pan boundaries';
    boundaryVisualizer.appendChild(label);
    
    document.body.appendChild(boundaryVisualizer);
    
    // this function will be called from the animation loop to update the boundary visualizer position
    function updateBoundaryVisualizerPosition(camera, renderer) {
        const visualizer = document.getElementById('pan-boundary-visualizer');
        if (!visualizer || !panBoundaries.enabled) {
            if (visualizer) visualizer.style.display = 'none';
            return;
        }
        
        visualizer.style.display = 'block';
        
        // define the corners of the boundaries in 3d space
        const corners3D = [
            new THREE.Vector3(panBoundaries.minX, panBoundaries.minY, 0.05),
            new THREE.Vector3(panBoundaries.maxX, panBoundaries.minY, 0.05),
            new THREE.Vector3(panBoundaries.maxX, panBoundaries.maxY, 0.05),
            new THREE.Vector3(panBoundaries.minX, panBoundaries.maxY, 0.05)
        ];
        
        // project corners to screen space
        const corners2D = corners3D.map(corner => {
            const vector = corner.clone();
            vector.project(camera);
            
            return {
                x: (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth,
                y: (-(vector.y * 0.5) + 0.5) * renderer.domElement.clientHeight
            };
        });
        
        // get bounding box in screen space
        const minX = Math.min(...corners2D.map(c => c.x));
        const minY = Math.min(...corners2D.map(c => c.y));
        const maxX = Math.max(...corners2D.map(c => c.x));
        const maxY = Math.max(...corners2D.map(c => c.y));
        
        // update visualizer position and size
        visualizer.style.left = `${minX}px`;
        visualizer.style.top = `${minY}px`;
        visualizer.style.width = `${maxX - minX}px`;
        visualizer.style.height = `${maxY - minY}px`;
    }
    
    return updateBoundaryVisualizerPosition;
}

// function to remove boundary visualizer
function removePanBoundaryVisualizer() {
    const visualizer = document.getElementById('pan-boundary-visualizer');
    if (visualizer) {
        visualizer.remove();
    }
}

// function to remove author region visualizer
function removeAuthorRegionVisualizer() {
    const visualizer = document.getElementById('author-region-visualizer');
    if (visualizer) {
        visualizer.remove();
    }
}

// function to create debug controls for panning and zooming
function createPanningDebugControls() {
    if (!DEVELOPMENT) return;
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'panning-controls-container'; // use class for container styles
    
    // title
    const title = document.createElement('div');
    title.className = 'panning-controls-title'; // use class for title styles
    title.textContent = 'panning & zoom controls';
    controlsContainer.appendChild(title);
    
    // drag sensitivity control
    const dragSensLabel = document.createElement('label');
    dragSensLabel.className = 'panning-controls-label'; // use class for label styles
    dragSensLabel.textContent = `drag sensitivity: ${dragSensitivity}`;
    dragSensLabel.style.marginBottom = '5px'; // specific style
    
    const dragSensSlider = document.createElement('input');
    dragSensSlider.className = 'panning-controls-slider'; // use class for slider styles
    dragSensSlider.type = 'range';
    dragSensSlider.min = '0.001';
    dragSensSlider.max = '0.05';
    dragSensSlider.step = '0.001';
    dragSensSlider.value = dragSensitivity;
    dragSensSlider.addEventListener('input', (e) => {
        dragSensitivity = parseFloat(e.target.value);
        dragSensLabel.textContent = `drag sensitivity: ${dragSensitivity.toFixed(3)}`;
    });
    
    controlsContainer.appendChild(dragSensLabel);
    controlsContainer.appendChild(dragSensSlider);
    
    // edge panning speed control
    const edgeSensLabel = document.createElement('label');
    edgeSensLabel.className = 'panning-controls-label'; // use class for label styles
    edgeSensLabel.textContent = `edge panning speed: ${maxPanSpeed}`;
    edgeSensLabel.style.marginBottom = '5px'; // specific style
    edgeSensLabel.style.marginTop = '10px'; // specific style
    
    const edgeSensSlider = document.createElement('input');
    edgeSensSlider.className = 'panning-controls-slider'; // use class for slider styles
    edgeSensSlider.type = 'range';
    edgeSensSlider.min = '0.01';
    edgeSensSlider.max = '0.3';
    edgeSensSlider.step = '0.01';
    edgeSensSlider.value = maxPanSpeed;
    edgeSensSlider.addEventListener('input', (e) => {
        window.maxPanSpeed = parseFloat(e.target.value);
        edgeSensLabel.textContent = `edge panning speed: ${window.maxPanSpeed.toFixed(2)}`;
    });
    
    controlsContainer.appendChild(edgeSensLabel);
    controlsContainer.appendChild(edgeSensSlider);
    
    // zoom speed control
    const zoomSpeedLabel = document.createElement('label');
    zoomSpeedLabel.className = 'panning-controls-label'; // use class for label styles
    zoomSpeedLabel.textContent = `zoom speed: ${zoomSpeed}`;
    zoomSpeedLabel.style.marginBottom = '5px'; // specific style
    zoomSpeedLabel.style.marginTop = '10px'; // specific style
    
    const zoomSpeedSlider = document.createElement('input');
    zoomSpeedSlider.className = 'panning-controls-slider'; // use class for slider styles
    zoomSpeedSlider.type = 'range';
    zoomSpeedSlider.min = '0.01';
    zoomSpeedSlider.max = '0.5';
    zoomSpeedSlider.step = '0.01';
    zoomSpeedSlider.value = zoomSpeed;
    zoomSpeedSlider.addEventListener('input', (e) => {
        window.zoomSpeed = parseFloat(e.target.value);
        zoomSpeedLabel.textContent = `zoom speed: ${window.zoomSpeed.toFixed(2)}`;
    });
    
    controlsContainer.appendChild(zoomSpeedLabel);
    controlsContainer.appendChild(zoomSpeedSlider);
    
    // zoom range controls
    const zoomRangeLabel = document.createElement('label');
    zoomRangeLabel.className = 'panning-controls-label'; // use class for label styles
    zoomRangeLabel.textContent = `zoom range: ${minScale} to ${maxScale}`;
    controlsContainer.appendChild(zoomRangeLabel);
    
    // min scale slider
    const minScaleLabel = document.createElement('label');
    minScaleLabel.className = 'panning-controls-label'; // use class for label styles
    minScaleLabel.textContent = `min scale: ${minScale}`;
    minScaleLabel.style.marginTop = '10px'; // specific style
    minScaleLabel.style.marginBottom = '5px'; // specific style
    
    const minScaleSlider = document.createElement('input');
    minScaleSlider.className = 'panning-controls-slider'; // use class for slider styles
    minScaleSlider.type = 'range';
    minScaleSlider.min = '0.1';
    minScaleSlider.max = '1';
    minScaleSlider.step = '0.05';
    minScaleSlider.value = minScale;
    minScaleSlider.addEventListener('input', (e) => {
        window.minScale = parseFloat(e.target.value);
        minScaleLabel.textContent = `min scale: ${window.minScale.toFixed(2)}`;
        zoomRangeLabel.textContent = `zoom range: ${window.minScale.toFixed(2)} to ${window.maxScale.toFixed(2)}`;
    });
    
    // max scale slider
    const maxScaleLabel = document.createElement('label');
    maxScaleLabel.className = 'panning-controls-label'; // use class for label styles
    maxScaleLabel.style.marginTop = '5px'; // specific style
    maxScaleLabel.textContent = `max scale: ${maxScale}`;
    
    const maxScaleSlider = document.createElement('input');
    maxScaleSlider.className = 'panning-controls-slider'; // use class for slider styles
    maxScaleSlider.type = 'range';
    maxScaleSlider.min = '1';
    maxScaleSlider.max = '10';
    maxScaleSlider.step = '0.5';
    maxScaleSlider.value = maxScale;
    maxScaleSlider.addEventListener('input', (e) => {
        window.maxScale = parseFloat(e.target.value);
        maxScaleLabel.textContent = `max scale: ${window.maxScale.toFixed(2)}`;
        zoomRangeLabel.textContent = `zoom range: ${window.minScale.toFixed(2)} to ${window.maxScale.toFixed(2)}`;
    });
    
    controlsContainer.appendChild(minScaleLabel);
    controlsContainer.appendChild(minScaleSlider);
    controlsContainer.appendChild(maxScaleLabel);
    controlsContainer.appendChild(maxScaleSlider);
    
    // region panning boundary controls
    const regionHeader = document.createElement('div');
    regionHeader.className = 'panning-controls-region-header'; // use class for region header styles
    regionHeader.textContent = 'region panning boundaries';
    controlsContainer.appendChild(regionHeader);
    
    // enable/disable boundaries checkbox
    const boundaryEnabledLabel = document.createElement('label');
    boundaryEnabledLabel.className = 'panning-controls-label'; // use class for label styles
    
    const boundaryEnabledCheckbox = document.createElement('input');
    boundaryEnabledCheckbox.type = 'checkbox';
    boundaryEnabledCheckbox.checked = panBoundaries.enabled;
    boundaryEnabledCheckbox.addEventListener('change', (e) => {
        panBoundaries.enabled = e.target.checked;
    });
    
    boundaryEnabledLabel.appendChild(boundaryEnabledCheckbox);
    const checkboxText = document.createTextNode(' enable region boundaries');
    const checkboxTextSpan = document.createElement('span');
    checkboxTextSpan.className = 'panning-controls-checkbox-text';
    checkboxTextSpan.appendChild(checkboxText);
    boundaryEnabledLabel.appendChild(checkboxTextSpan);
    controlsContainer.appendChild(boundaryEnabledLabel);
    
    // min X boundary
    const boundaryMinXLabel = document.createElement('label');
    boundaryMinXLabel.className = 'panning-controls-label'; // use class for label styles
    boundaryMinXLabel.textContent = `min x: ${panBoundaries.minX}`;
    boundaryMinXLabel.style.marginTop = '5px'; // specific style
    
    const boundaryMinXSlider = document.createElement('input');
    boundaryMinXSlider.className = 'panning-controls-slider'; // use class for slider styles
    boundaryMinXSlider.type = 'range';
    boundaryMinXSlider.min = '-50';
    boundaryMinXSlider.max = '0';
    boundaryMinXSlider.step = '1';
    boundaryMinXSlider.value = panBoundaries.minX;
    boundaryMinXSlider.disabled = !panBoundaries.enabled;
    boundaryMinXSlider.addEventListener('input', (e) => {
        panBoundaries.minX = parseFloat(e.target.value);
        boundaryMinXLabel.textContent = `min x: ${panBoundaries.minX}`;
    });
    
    controlsContainer.appendChild(boundaryMinXLabel);
    controlsContainer.appendChild(boundaryMinXSlider);
    
    // max X boundary
    const boundaryMaxXLabel = document.createElement('label');
    boundaryMaxXLabel.className = 'panning-controls-label'; // use class for label styles
    boundaryMaxXLabel.textContent = `max x: ${panBoundaries.maxX}`;
    boundaryMaxXLabel.style.marginTop = '5px'; // specific style
    
    const boundaryMaxXSlider = document.createElement('input');
    boundaryMaxXSlider.className = 'panning-controls-slider'; // use class for slider styles
    boundaryMaxXSlider.type = 'range';
    boundaryMaxXSlider.min = '0';
    boundaryMaxXSlider.max = '50';
    boundaryMaxXSlider.step = '1';
    boundaryMaxXSlider.value = panBoundaries.maxX;
    boundaryMaxXSlider.disabled = !panBoundaries.enabled;
    boundaryMaxXSlider.addEventListener('input', (e) => {
        panBoundaries.maxX = parseFloat(e.target.value);
        boundaryMaxXLabel.textContent = `max x: ${panBoundaries.maxX}`;
    });
    
    controlsContainer.appendChild(boundaryMaxXLabel);
    controlsContainer.appendChild(boundaryMaxXSlider);
    
    // min Y boundary
    const boundaryMinYLabel = document.createElement('label');
    boundaryMinYLabel.className = 'panning-controls-label'; // use class for label styles
    boundaryMinYLabel.textContent = `min y: ${panBoundaries.minY}`;
    boundaryMinYLabel.style.marginTop = '5px'; // specific style
    
    const boundaryMinYSlider = document.createElement('input');
    boundaryMinYSlider.className = 'panning-controls-slider'; // use class for slider styles
    boundaryMinYSlider.type = 'range';
    boundaryMinYSlider.min = '-50';
    boundaryMinYSlider.max = '0';
    boundaryMinYSlider.step = '1';
    boundaryMinYSlider.value = panBoundaries.minY;
    boundaryMinYSlider.disabled = !panBoundaries.enabled;
    boundaryMinYSlider.addEventListener('input', (e) => {
        panBoundaries.minY = parseFloat(e.target.value);
        boundaryMinYLabel.textContent = `min y: ${panBoundaries.minY}`;
    });
    
    controlsContainer.appendChild(boundaryMinYLabel);
    controlsContainer.appendChild(boundaryMinYSlider);
    
    // max Y boundary
    const boundaryMaxYLabel = document.createElement('label');
    boundaryMaxYLabel.className = 'panning-controls-label'; // use class for label styles
    boundaryMaxYLabel.textContent = `max y: ${panBoundaries.maxY}`;
    boundaryMaxYLabel.style.marginTop = '5px'; // specific style
    
    const boundaryMaxYSlider = document.createElement('input');
    boundaryMaxYSlider.className = 'panning-controls-slider'; // use class for slider styles
    boundaryMaxYSlider.type = 'range';
    boundaryMaxYSlider.min = '0';
    boundaryMaxYSlider.max = '50';
    boundaryMaxYSlider.step = '1';
    boundaryMaxYSlider.value = panBoundaries.maxY;
    boundaryMaxYSlider.disabled = !panBoundaries.enabled;
    boundaryMaxYSlider.addEventListener('input', (e) => {
        panBoundaries.maxY = parseFloat(e.target.value);
        boundaryMaxYLabel.textContent = `max y: ${panBoundaries.maxY}`;
    });
    
    controlsContainer.appendChild(boundaryMaxYLabel);
    controlsContainer.appendChild(boundaryMaxYSlider);
    
    // reset button
    const resetButton = document.createElement('button');
    resetButton.className = 'panning-controls-reset-button'; // use class for button styles
    resetButton.textContent = 'reset view';
    resetButton.addEventListener('click', () => {
        targetX = 0;
        targetY = 0;
        targetScale = 1;
        currentScale = 1;
    });
    
    controlsContainer.appendChild(resetButton);
    
    document.body.appendChild(controlsContainer);
}

// function to add text label as a sprite in the 3d scene
// uses three.js sprites
function addLabel(scene, text, x, y, z, options = {}) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    const fontSize = options.fontSize || 24; // default font size
    const fontFace = options.fontFace || 'Arial';
    const textColorHex = options.color || '#000000'; // default black
    const backgroundColorRgba = options.backgroundColor || 'rgba(0,0,0,0)'; // default transparent background

    context.font = `${fontSize}px ${fontFace}`;
    const textMetrics = context.measureText(text);
    // add some padding to the canvas width and height
    const padding = fontSize * 0.5;
    canvas.width = textMetrics.width + padding;
    canvas.height = fontSize + padding; 

    // re-apply font after canvas resize
    context.font = `${fontSize}px ${fontFace}`;

    // background
    context.fillStyle = backgroundColorRgba;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // text
    context.fillStyle = textColorHex;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true; // ensure the texture updates

    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    sprite.position.set(x, y, z);

    // scale the sprite.
    // a sprite is 1x1 by default in world units if its map is square.
    // we want the sprite's apparent height to be somewhat consistent.
    // the scale factors in options (scalex, scaley) are multipliers.
    const desiredVisualHeight = options.visualHeight || 0.3; // desired height of the text in world units
    
    sprite.scale.x = (canvas.width / canvas.height) * desiredVisualHeight * (options.scaleX || 1);
    sprite.scale.y = desiredVisualHeight * (options.scaleY || 1);
    
    scene.add(sprite);
    return sprite;
}

// show work in progress overlay
function showWipOverlay() {
    // create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'wip-overlay';
    overlay.className = 'wip-overlay'; 

    // create image
    const img = document.createElement('img');
    img.src = './assets/photos/wip.png';
    img.alt = 'work in progress';
    img.className = 'wip-overlay-img';
    overlay.appendChild(img);

    // create message
    const msg = document.createElement('div');
    msg.textContent = 'we are still working on it (◡ ‿ ◡ .)';
    msg.className = 'wip-overlay-msg';
    overlay.appendChild(msg);

    // create okay button
    const btn = document.createElement('button');
    btn.textContent = 'okay';
    btn.className = 'wip-overlay-btn';
    btn.addEventListener('click', function(e) {
        e.stopPropagation(); // prevent event from bubbling
        overlay.remove();
    });
    overlay.appendChild(btn);

    // add overlay to body
    document.body.appendChild(overlay);
}

// show the overlay as soon as possible if enabled
if (SHOW_WIP_OVERLAY) {
    showWipOverlay();
}

// expose functions to global scope
window.initTriggerAreas = initTriggerAreas;
window.drawTriggerAreas = drawTriggerAreas;
window.visualizeAuthorRegion = visualizeAuthorRegion;
window.visualizePanBoundaries = visualizePanBoundaries;
window.removeAuthorRegionVisualizer = removeAuthorRegionVisualizer;
window.removePanBoundaryVisualizer = removePanBoundaryVisualizer;
window.createPanningDebugControls = createPanningDebugControls;
window.addLabel = addLabel;
window.showWipOverlay = showWipOverlay;
