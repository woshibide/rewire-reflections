// initialize development mode at the start of execution
window.DEVELOPMENT = false; // set to true to enable development features

// fetch authors data and create the article elements
async function loadArticles() {
    try {
        // initialize development mode before loading articles
        // check if URL has ?dev=true parameter
        const urlParams = new URLSearchParams(window.location.search);
        const devMode = urlParams.get('dev');
        window.DEVELOPMENT = devMode === 'true';
        
        // log development mode status
        console.log(`archive mode: ${window.DEVELOPMENT ? 'development' : 'production'}`);
        
        const response = await fetch('./authors.json');
        const data = await response.json();
        
        // get unique authors for the three.js background
        // extract all authors, accounting for multi-author entries with "+"
        const allAuthors = data.articles.flatMap(article => {
            if (article.author.includes('+')) {
                return article.author.split('+').map(name => name.trim());
            }
            return article.author;
        });
        
        // create a unique set of author names
        const uniqueAuthors = [...new Set(allAuthors)];
        
        // initialize three.js scene with author names
        initThreeJS();
        createAuthorMeshes(uniqueAuthors);
        
        // initialize with empty container - no content shown initially
        renderArticles(data.articles, false);
        
        // dynamically generate filter options
        generateFilters(data.articles);
        
        // setup filter functionality
        setupFilters(data.articles);
        
        // ensure all author cubes start at full opacity
        if (window.updateAuthorOpacity) {
            window.updateAuthorOpacity(null);
        }
        
        // add event listener for author clicks from three.js scene
        document.addEventListener('authorClick', (event) => {
            // when an author is clicked in the 3d scene, filter the articles
            const clickedAuthor = event.detail.author;
            filterArticlesByAuthor(clickedAuthor, data.articles);
        });
        
        // add event listener to header h1 element to center the canvas camera when clicked
        const headerTitle = document.querySelector('header h1');
        if (headerTitle) {
            headerTitle.addEventListener('click', () => {
                // center the camera on the canvas
                if (window.centerCamera) {
                    window.centerCamera();
                    
                    // provide visual feedback in the dom as well
                    const feedbackEl = document.createElement('div');
                    feedbackEl.className = 'center-feedback';
                    feedbackEl.textContent = 'View centered';
                    document.body.appendChild(feedbackEl);
                    
                    // animate and remove the feedback element
                    setTimeout(() => {
                        feedbackEl.style.opacity = '0';
                        setTimeout(() => feedbackEl.remove(), 500);
                    }, 1500);
                }
            });
            
            // add cursor style and tooltip to indicate the element is clickable
            headerTitle.style.cursor = 'pointer';
            headerTitle.setAttribute('title', 'Click to center view');
        }
        
    } catch (error) {
        console.error('error loading authors data:', error);
    }
}

// render article elements to the dom
function renderArticles(articles, showContent = false) {
    const container = document.getElementById('articles-container');
    container.innerHTML = '';
    
    // if showContent is false, don't render any articles
    // this ensures no content is shown until filters are applied or an author is clicked
    if (!showContent) {
        return;
    }
    
    articles.forEach(article => {
        const articleElement = document.createElement('div');
        articleElement.className = 'article';
        articleElement.dataset.year = article.year;
        articleElement.dataset.theme = article.theme;
        articleElement.dataset.type = article.type;
        
        // build the article html
        articleElement.innerHTML = `
            <div class="article-left-column">
                <h3 class="author">${article.author}</h3>
                <div class="description">${article.description}</div>
            </div>
            <div class="article-right-column">
                <div class="title">${article.title}</div>
                ${article.text ? `<div class="article-text">${article.text.replace(/\n/g, '<br>')}</div>` : ''}
            </div>
        `;
        
        // append the article element to the container
        container.appendChild(articleElement);
    });
    
    // dispatch a custom event to notify that articles have been rendered
    const articlesRenderedEvent = new CustomEvent('articlesRendered');
    document.dispatchEvent(articlesRenderedEvent);
}

// function to create filter options dynamically from articles data
function generateFilters(articles) {
    // get all unique values for each filter type
    const filterTypes = ['year', 'theme', 'type'];
    const filterValues = {};
    
    // initialize filter values for each type
    filterTypes.forEach(type => {
        filterValues[type] = new Set();
    });
    
    // collect all unique values for each filter type
    articles.forEach(article => {
        filterTypes.forEach(type => {
            if (article[type]) {
                // if the property contains multiple values (comma-separated)
                if (typeof article[type] === 'string' && article[type].includes(',')) {
                    article[type].split(',').forEach(value => {
                        filterValues[type].add(value.trim());
                    });
                } else {
                    filterValues[type].add(article[type]);
                }
            }
        });
    });
    
    // create filter sections in the DOM
    const filtersContainer = document.querySelector('.filters');
    if (!filtersContainer) {
        console.error('filters container not found');
        return;
    }
    
    // clear existing filters
    filtersContainer.innerHTML = '';
    
    // create filter sections for each type
    filterTypes.forEach(type => {
        // only create a section if we have values for this filter type
        if (filterValues[type].size > 0) {
            // create filter section
            const section = document.createElement('div');
            section.className = 'filter-section';
            
            // create heading
            const heading = document.createElement('h2');
            heading.textContent = type.charAt(0).toUpperCase() + type.slice(1); // capitalize first letter
            section.appendChild(heading);
            
            // create list
            const list = document.createElement('ul');
            
            // create list items for each value
            [...filterValues[type]].sort().forEach(value => {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = '#';
                link.dataset.filter = type;
                link.dataset.value = value;
                link.textContent = value;
                
                listItem.appendChild(link);
                list.appendChild(listItem);
            });
            
            section.appendChild(list);
            filtersContainer.appendChild(section);
        }
    });
}

// setup filter functionality
function setupFilters(allArticles) {
    const filterLinks = document.querySelectorAll('.filter-section a');
    
    filterLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const filterType = link.dataset.filter;
            
            // if the clicked link is already active, deactivate it
            if (link.classList.contains('active')) {
                link.classList.remove('active');
            } else {
                // deactivate other active links in the same filter group
                document.querySelectorAll(`.filter-section a[data-filter="${filterType}"]`).forEach(el => {
                    el.classList.remove('active');
                });
                // activate the clicked link
                link.classList.add('active');
            }
            
            // apply filters
            applyFilters(allArticles);
        });
    });
}

// apply all active filters
function applyFilters(allArticles) {
    const activeFilters = {};
    
    // gather all active filters
    document.querySelectorAll('.filter-section a.active').forEach(link => {
        const filterType = link.dataset.filter;
        const filterValue = link.dataset.value;
        activeFilters[filterType] = filterValue.toLowerCase(); // store filter value in lowercase
    });
    
    // filter articles
    const filteredArticles = allArticles.filter(article => {
        for (const [filterType, filterValue] of Object.entries(activeFilters)) {
            // ensure article property exists
            if (!article[filterType]) {
                return false;
            }
            
            const articleValue = article[filterType].toString().toLowerCase();
            
            // check if the article's value contains multiple values (comma-separated)
            if (articleValue.includes(',')) {
                // split by comma and check if any value matches the filter
                const values = articleValue.split(',').map(v => v.trim());
                if (!values.includes(filterValue)) {
                    return false;
                }
            } else if (articleValue !== filterValue) {
                // simple value comparison
                return false;
            }
        }
        return true;
    });
    
    // only show content if there are active filters
    const hasActiveFilters = Object.keys(activeFilters).length > 0;
    
    // render filtered articles - only show if filters are active
    renderArticles(filteredArticles, hasActiveFilters);
        
    // update author cube opacity based on filtered articles
    if (window.updateAuthorOpacity) {
        // if no active filters, pass null to reset all cubes to default opacity
        if (!hasActiveFilters) {
            window.updateAuthorOpacity(null);
        } else {
            window.updateAuthorOpacity(filteredArticles);
        }
    }
        
    // also update CSS3D elements if they exist
    if (window.css3dIntegration && window.css3dIntegration.updateAuthorElementOpacity) {
        if (!hasActiveFilters) {
            window.css3dIntegration.updateAuthorElementOpacity(null);
        } else {
            window.css3dIntegration.updateAuthorElementOpacity(filteredArticles);
        }
    }
}

// function to filter articles by author
function filterArticlesByAuthor(author, allArticles) {
    // filter the articles to only show the clicked author's work
    const filteredArticles = allArticles.filter(article => {
        // exact match
        if (article.author === author) {
            return true;
        }
        
        // check for author in a multi-author entry (e.g., "Author1 + Author2")
        if (article.author.includes('+')) {
            const authors = article.author.split('+').map(name => name.trim());
            return authors.includes(author);
        }
        
        return false;
    });
    
    // update the display - show content when filtering by author
    renderArticles(filteredArticles, true);
    
    // update author cube opacity based on filtered articles
    if (window.updateAuthorOpacity) {
        window.updateAuthorOpacity(filteredArticles);
    }
    
    // also update CSS3D elements if they exist
    if (window.css3dIntegration && window.css3dIntegration.updateAuthorElementOpacity) {
        window.css3dIntegration.updateAuthorElementOpacity(filteredArticles);
    }
    
    // update any ui to show we're filtering
    console.log(`filtering articles by author: ${author}`);
}

// initialize on document load
document.addEventListener('DOMContentLoaded', loadArticles);