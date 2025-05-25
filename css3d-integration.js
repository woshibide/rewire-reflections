// css3d-integration.js - integrates html elements with the 3d scene
// this file provides css3d rendering capabilities to place html elements in 3d space

// check if three.js and css3drenderer are available
if (!window.THREE) {
    console.error('three.js is required for css3d integration');
}

if (!window.THREE.CSS3DRenderer) {
    console.error('three.js CSS3DRenderer is required for css3d integration');
}

// global variables
let css3dScene, css3dRenderer;
let authorElements = [];

// initialize css3d renderer
function initCSS3DRenderer() {
    // debug logging if available
    if (window.debugLog) {
        window.debugLog('initializing css3d renderer for html elements');
    } else {
        console.log('initializing css3d renderer for html elements');
    }
    
    // create css3d scene
    css3dScene = new THREE.Scene();
    
    // create css3d renderer
    css3dRenderer = new THREE.CSS3DRenderer();
    css3dRenderer.setSize(window.innerWidth, window.innerHeight);
    css3dRenderer.domElement.style.position = 'absolute';
    css3dRenderer.domElement.style.top = 0;
    
    // add css3d renderer to the dom
    const container = document.getElementById('css-renderer-container');
    if (container) {
        container.appendChild(css3dRenderer.domElement);
    } else {
        console.error('css-renderer-container not found in DOM');
        return false;
    }
    
    // handle window resize for css3d renderer
    window.addEventListener('resize', function() {
        css3dRenderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // make the css3d scene available globally for debugging
    window.css3dScene = css3dScene;
    window.css3dRenderer = css3dRenderer;
    
    return true;
}

// create html element for author and title
function createCSS3DElement(author, title, options = {}) {
    // create container for both title and author elements
    const container = document.createElement('div');
    container.className = 'article-3d-element';
    
    // add year-specific class if year is available in article
    if (options.article && options.article.year) {
        // add year classes for styling
        container.classList.add(`article-year-${options.article.year}`);
    }
    
    // create title element
    const titleElement = document.createElement('div');
    titleElement.className = 'article-3d-title';
    titleElement.textContent = title || author; // fallback to author if no title
    container.appendChild(titleElement);
    
    // create author element
    const authorElement = document.createElement('div');
    authorElement.className = 'article-3d-author';
    authorElement.textContent = author;
    container.appendChild(authorElement);
    
    // create object to hold the css3d element
    const objectCSS = new THREE.CSS3DObject(container);
    
    // scale values for css3d objects
    const scale = options.scale || 0.01; // scale for css3d objects (they're much larger by default)
    objectCSS.scale.set(scale, scale, scale);
    
    // store the author name for filtering
    objectCSS.userData = {
        author: author,
        title: title,
        htmlElement: container,
        article: options.article || null,
        year: options.article?.year
    };
    
    // add click event listener to the container element
    container.addEventListener('click', function(event) {
        event.preventDefault();
        
        // dispatch author click event - works with existing code
        const authorClickEvent = new CustomEvent('authorClick', {
            detail: {
                author: author
            }
        });
        document.dispatchEvent(authorClickEvent);
        
        // optional - focus camera on this element using existing function if available
        if (window.focusOnObject) {
            window.focusOnObject(objectCSS);
        }
    });
    
    return objectCSS;
}

// create css3d elements for authors
function createAuthorElements(authors, authorArticles) {
    // clear any existing author elements
    authorElements.forEach(element => {
        css3dScene.remove(element);
    });
    authorElements = [];
    
    // helper function to generate random position 
    // this should match the positioning logic in createAuthorMeshes
    function generateRandomPosition(regionWidth, regionHeight, minDistance, existingPositions) {
        const maxAttempts = 50;
        let attempts = 0;
        let position;
        
        do {
            position = {
                x: (Math.random() * regionWidth) - (regionWidth / 2),
                y: (Math.random() * regionHeight) - (regionHeight / 2),
                z: 0.1 // slightly above the plane
            };
            attempts++;
            
            // check distance from existing positions
            let tooClose = false;
            for (const existing of existingPositions) {
                const dx = position.x - existing.x;
                const dy = position.y - existing.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                break;
            }
        } while (attempts < maxAttempts);
        
        return position;
    }
    
    // define the region bounds for random placement
    // these values match those in createAuthorMeshes
    const regionScale = 4;
    const regionWidth = 16 * regionScale;
    const regionHeight = 9 * regionScale;
    const minDistance = 1.5;
    
    // keep track of positions to prevent overlap
    const existingPositions = [];
    
    // create a css3d element for each author
    authors.forEach(author => {
        // get the articles for this author
        const articles = authorArticles[author] || [];
        const article = articles.length > 0 ? articles[0] : null;
        
        // get title from article or use author name if no article
        const title = article ? article.title : author;
        
        // generate position that doesn't overlap with existing positions
        const position = generateRandomPosition(regionWidth, regionHeight, minDistance, existingPositions);
        existingPositions.push(position);
        
        // create css3d element with all article data including year
        const css3dObject = createCSS3DElement(author, title, { 
            article: article,
            scale: 0.01
        });
        
        // add year information to userData for later filtering
        if (article && article.year) {
            css3dObject.userData.year = article.year;
        }
        
        // position the element
        css3dObject.position.set(position.x, position.y, position.z);
        // add slight random rotation for visual interest
        // css3dObject.rotation.z = Math.random() * 0.4 - 0.2; // -0.2 to 0.2 radians
        
        // add to scene
        css3dScene.add(css3dObject);
        
        // store reference for later updates
        authorElements.push(css3dObject);
    });
    
    if (window.debugLog) {
        window.debugLog(`created ${authorElements.length} css3d elements for authors`);
    }
    
    return authorElements;
}

// update css3d renderer
function updateCSS3DRenderer(camera) {
    if (css3dRenderer && css3dScene && camera) {
        css3dRenderer.render(css3dScene, camera);
    }
}

// update author element opacity - compatible with existing filtering
function updateAuthorElementOpacity(filteredArticles) {
    if (!authorElements.length) {
        return;
    }
    
    authorElements.forEach(element => {
        const htmlElement = element.userData.htmlElement;
        
        // if null is passed, reset all to full opacity
        if (filteredArticles === null) {
            element.visible = true;
            htmlElement.style.opacity = '1';
            return;
        }
        
        // check if this author is in the filtered articles
        const author = element.userData.author;
        const authorInFilter = filteredArticles.some(article => {
            // exact match
            if (article.author === author) {
                // also update year-specific class if needed
                if (article.year && element.userData.year !== article.year) {
                    // update element's year class if necessary
                    element.userData.year = article.year;
                    htmlElement.classList.remove('article-year-2024', 'article-year-2025');
                    htmlElement.classList.add(`article-year-${article.year}`);
                }
                return true;
            }
            
            // check for author in a multi-author entry
            if (article.author.includes('+')) {
                const authors = article.author.split('+').map(name => name.trim());
                return authors.includes(author);
            }
            
            return false;
        });
        
        // update visibility/opacity
        if (authorInFilter) {
            element.visible = true;
            htmlElement.style.opacity = '1';
        } else {
            element.visible = true; // keep visible but reduce opacity
            htmlElement.style.opacity = '0.2';
        }
    });
}

// expose functions to global scope
window.css3dIntegration = {
    init: initCSS3DRenderer,
    createAuthorElements: createAuthorElements,
    updateCSS3DRenderer: updateCSS3DRenderer,
    updateAuthorElementOpacity: updateAuthorElementOpacity
};

// expose css3d versions of functions for compatibility with existing code
window.updateAuthorElementOpacity = updateAuthorElementOpacity;

// automatically initialize on page load
document.addEventListener('DOMContentLoaded', initCSS3DRenderer);
