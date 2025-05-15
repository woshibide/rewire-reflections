// main script file - three.js functionality has been moved to three-scene.js

// fetch authors data and create the article elements
async function loadArticles() {
    try {
        const response = await fetch('authors.json');
        const data = await response.json();
        
        // get unique authors for the three.js background
        const uniqueAuthors = [...new Set(data.articles.map(article => article.author))];
        
        // initialize three.js scene with author names
        initThreeJS();
        createAuthorMeshes(uniqueAuthors);
        
        // render articles
        renderArticles(data.articles);
        
        // setup filter functionality
        setupFilters(data.articles);
        
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
                    
                    // provide visual feedback in the DOM as well
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
function renderArticles(articles) {
    const container = document.getElementById('articles-container');
    container.innerHTML = '';
    
    articles.forEach(article => {
        const articleElement = document.createElement('div');
        articleElement.className = 'article';
        articleElement.dataset.year = article.year;
        articleElement.dataset.theme = article.theme;
        articleElement.dataset.type = article.type;
        
        articleElement.innerHTML = `
            <div class="author">${article.author}</div>
            <div class="title">${article.title}</div>
            <div class="description">${article.description}</div>
        `;
        
        container.appendChild(articleElement);
    });
}

// setup filter functionality
function setupFilters(allArticles) {
    const filterLinks = document.querySelectorAll('.filter-section a');
    
    filterLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // update active class
            const filterType = link.dataset.filter;
            document.querySelectorAll(`.filter-section a[data-filter="${filterType}"]`).forEach(el => {
                el.classList.remove('active');
            });
            link.classList.add('active');
            
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
        activeFilters[filterType] = filterValue;
    });
    
    // filter articles
    const filteredArticles = allArticles.filter(article => {
        for (const [filterType, filterValue] of Object.entries(activeFilters)) {
            if (article[filterType] !== filterValue) {
                return false;
            }
        }
        return true;
    });
    
    // render filtered articles
    renderArticles(filteredArticles);
}

// function to filter articles by author
function filterArticlesByAuthor(author, allArticles) {
    // filter the articles to only show the clicked author's work
    const filteredArticles = allArticles.filter(article => article.author === author);
    
    // update the display
    renderArticles(filteredArticles);
    
    // update any UI to show we're filtering (you could add this later)
    console.log(`filtering articles by author: ${author}`);
}

// initialize on document load
document.addEventListener('DOMContentLoaded', loadArticles);