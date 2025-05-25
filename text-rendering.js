// text-rendering.js - text rendering utilities
// this file sets up sprite-based text rendering for article titles and author names

// check if three.js is available
if (!window.THREE) {
    console.error('three.js is required for text rendering');
}

// fonts to try (in order of preference)
const FONT_STACK = [
    'ApfelGrotezk-Regular',
    'Univers Else',
    'Arial',
    'sans-serif'
];

// global font cache
const fontCache = {
    loaded: false,
    fontFamily: null,
    fallbackUsed: false
};

// initialize font loading
async function initFonts() {
    // debug logging if available
    if (window.debugLog) {
        window.debugLog('initializing fonts for text rendering');
    }
    
    // check for font availability - try each font in our stack
    for (const font of FONT_STACK) {
        try {
            // try to create a font observer
            const testString = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const testElement = document.createElement('div');
            testElement.style.position = 'absolute';
            testElement.style.top = '-9999px';
            testElement.style.left = '-9999px';
            testElement.style.visibility = 'hidden';
            testElement.style.fontFamily = font;
            testElement.textContent = testString;
            document.body.appendChild(testElement);
            
            // if we reach this point, font is potentially available
            fontCache.loaded = true;
            fontCache.fontFamily = font;
            fontCache.fallbackUsed = font === 'Arial' || font === 'sans-serif';
            
            if (window.debugLog) {
                window.debugLog(`using font: ${font}, fallback: ${fontCache.fallbackUsed}`);
            }
            
            // clean up test element
            document.body.removeChild(testElement);
            break;
        } catch (error) {
            if (window.debugLog) {
                window.debugLog(`error testing font ${font}:`, error);
            }
            // continue to next font
        }
    }
    
    // if we couldn't load any font, use system default
    if (!fontCache.loaded) {
        fontCache.loaded = true;
        fontCache.fontFamily = 'sans-serif';
        fontCache.fallbackUsed = true;
        
        if (window.debugLog) {
            window.debugLog('falling back to system sans-serif font');
        }
    }
    
    return fontCache;
}

// create text sprite with optimized settings
function createTextSprite(text, options = {}) {
    // ensure options are properly defined
    const fontSize = options.fontSize || 24;
    const fontFamily = options.fontFamily || fontCache.fontFamily || 'sans-serif';
    const color = options.color || 'white';
    const backgroundColor = options.backgroundColor || 'rgba(0,0,0,0.5)';
    const padding = options.padding || fontSize * 0.5;
    
    // create canvas and context
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // set font and measure text
    context.font = `${fontSize}px ${fontFamily}`;
    const metrics = context.measureText(text);
    const textWidth = metrics.width;
    
    // set canvas dimensions with padding
    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize * 1.5 + padding * 2;
    
    // clear and set background
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // reset font after resizing canvas
    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // draw text centered
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // create material with optimized settings
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });
    
    // create and return sprite
    const sprite = new THREE.Sprite(material);
    
    // set scale based on desired world size
    const worldHeight = options.worldHeight || 0.5;
    sprite.scale.x = (canvas.width / canvas.height) * worldHeight;
    sprite.scale.y = worldHeight;
    
    return sprite;
}

// override addLabel function if needed to use our optimized version
function overrideAddLabel() {
    if (!window.addLabel || window.DEVELOPMENT) {
        // don't override in development mode
        return;
    }
    
    // store original function as fallback
    const originalAddLabel = window.addLabel;
    
    // create new optimized version
    window.addLabel = function(scene, text, x, y, z, options = {}) {
        // debug logging
        if (window.debugLog) {
            window.debugLog(`creating optimized label: "${text}" at (${x}, ${y}, ${z})`);
        }
        
        try {
            // use our optimized renderer
            const sprite = createTextSprite(text, {
                fontSize: options.fontSize || 24,
                fontFamily: options.fontFace || fontCache.fontFamily,
                color: options.color || 'white',
                backgroundColor: options.backgroundColor || 'rgba(0,0,0,0.5)',
                worldHeight: options.visualHeight || 0.3
            });
            
            // position the sprite
            sprite.position.set(x, y, z);
            
            // add to scene
            scene.add(sprite);
            return sprite;
        } catch (error) {
            // log error
            if (window.debugLog) {
                window.debugLog('error creating optimized label, falling back to original:', error);
            }
            
            // fallback to original function
            return originalAddLabel(scene, text, x, y, z, options);
        }
    };
}

// initialize text rendering system
async function initTextRendering() {
    // debug mode detection
    const debugMode = window.DEVELOPMENT || false;
    
    // log if debug function available
    if (window.debugLog) {
        window.debugLog(`initializing text rendering system, debug: ${debugMode}`);
    } else {
        console.log(`initializing text rendering system, debug: ${debugMode}`);
    }
    
    // load fonts
    await initFonts();
    
    // override addLabel if needed
    overrideAddLabel();
    
    // log completion
    if (window.debugLog) {
        window.debugLog('text rendering system initialized');
    } else {
        console.log('text rendering system initialized');
    }
}

// expose the functions to global scope
window.textRendering = {
    init: initTextRendering,
    createTextSprite: createTextSprite,
    fontCache: fontCache
};

// automatically initialize on page load
document.addEventListener('DOMContentLoaded', initTextRendering);
