/**
 * article-background.js - controls the animated background for article text
 * this script adds expand/collapse functionality to articles and manages the animated background
 */

// the height of the background element when fully expanded (in vh units)
const BACKGROUND_HEIGHT = 56;
// animation duration for the background (in ms)
const ANIMATION_DURATION = 800;
// delay before starting the animation (in ms)
const ANIMATION_DELAY = 50;

document.addEventListener('DOMContentLoaded', function() {
    // create the background element that appears behind expanded article text
    const backgroundElement = document.createElement('div');
    backgroundElement.id = 'article-background';
    document.body.appendChild(backgroundElement);
    
    // function to add toggle buttons to all article text elements
    function setupArticleToggling() {
        const articleTextElements = document.querySelectorAll('.article-text');
        
        articleTextElements.forEach(textElement => {
            // initially set articles to collapsed state
            textElement.classList.add('collapsed');
            
            // create toggle button for each article
            const toggleButton = document.createElement('button');
            toggleButton.className = 'toggle-text';
            toggleButton.textContent = 'Read more';
            
            // insert toggle button after text element
            textElement.parentNode.insertBefore(toggleButton, textElement.nextSibling);
            
            // add click event listener to toggle button
            toggleButton.addEventListener('click', function() {
                const isExpanded = textElement.classList.contains('expanded');
                
                // toggle classes
                if (isExpanded) {
                    textElement.classList.remove('expanded');
                    textElement.classList.add('collapsed');
                    toggleButton.textContent = 'Read more';
                    hideBackground();
                } else {
                    textElement.classList.remove('collapsed');
                    textElement.classList.add('expanded');
                    toggleButton.textContent = 'Show less';
                    showBackground(textElement);
                }
            });
        });
    }
    
    // function to show the background element with animation
    function showBackground(textElement) {
        const background = document.getElementById('article-background');
        
        // ensure we start from a clean state
        background.style.display = 'block';
        background.style.height = '0';
        background.style.opacity = '0';
        
        // slight delay for smoother animation sequence and to prevent any rendering issues
        setTimeout(() => {
            // set opacity first to fade in the element
            background.style.opacity = '1';
            
            // small delay before starting height animation for better visual effect
            setTimeout(() => {
                background.style.transition = `height ${ANIMATION_DURATION}ms cubic-bezier(0.19, 1, 0.22, 1), opacity 300ms ease-in`;
                background.style.height = `${BACKGROUND_HEIGHT}vh`;
            }, ANIMATION_DELAY);
        }, 10);
    }
    
    // function to hide the background element with animation
    function hideBackground() {
        const background = document.getElementById('article-background');
        
        // first start fading out the opacity
        background.style.opacity = '0';
        
        // then start reducing the height
        setTimeout(() => {
            background.style.transition = `height ${ANIMATION_DURATION}ms cubic-bezier(0.55, 0.085, 0.68, 0.53), opacity 300ms ease-out`;
            background.style.height = '0';
            
            // hide completely after animation completes
            setTimeout(() => {
                background.style.display = 'none';
            }, ANIMATION_DURATION);
        }, 100);
    }
    
    // initialize the article toggling functionality after articles are loaded
    // check if articles have been rendered
    if (document.querySelector('.article')) {
        setupArticleToggling();
    } else {
        // Listen for the custom event from scripts.js
        document.addEventListener('articlesRendered', function() {
            setupArticleToggling();
            // Hide background when articles change
            hideBackground();
        });
    }
    
    // Also listen for any filter changes to reset the background
    document.addEventListener('click', function(e) {
        if (e.target.closest('.filter-section a')) {
            hideBackground();
        }
    });
});
