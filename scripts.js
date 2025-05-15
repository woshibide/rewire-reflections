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

// initialize on document load
document.addEventListener('DOMContentLoaded', loadArticles); 