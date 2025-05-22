
// this file contains only the visual aspects of the search bar
// without implementing actual search functionality yet

document.addEventListener('DOMContentLoaded', function() {
    // get search form elements
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    if (!searchForm || !searchInput || !searchButton) return;
    
    // prevent form submission (since we're not implementing real functionality yet)
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // visual feedback only - simulate "searching" animation
        searchButton.classList.add('searching');
        
        // remove the animation class after a short delay
        setTimeout(() => {
            searchButton.classList.remove('searching');
        }, 300);
        
        return false;
    });
    
    // // add keyboard shortcut to focus the search bar (Ctrl+K or Cmd+K)
    // document.addEventListener('keydown', function(e) {
    //     // Check for Ctrl+K or Cmd+K
    //     if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    //         e.preventDefault();
    //         searchInput.focus();
    //     }
        
    //     // If ESC is pressed while search is focused, clear and blur
    //     if (e.key === 'Escape' && document.activeElement === searchInput) {
    //         searchInput.value = '';
    //         searchInput.blur();
    //     }
    // });
    
    // add visual feedback for search icon on focus/hover
    searchInput.addEventListener('focus', function() {
        searchButton.classList.add('input-focused');
    });
    
    searchInput.addEventListener('blur', function() {
        searchButton.classList.remove('input-focused');
    });
});
