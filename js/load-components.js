/**
 * Load modular HTML components
 * This script loads HTML components from the includes directory
 * and inserts them into the page at the specified target elements.
 */
(function() {
  // Load the footer component
  fetch('/includes/footer.html')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(html => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      document.getElementById('footer-container').appendChild(tempDiv.firstChild);
      
      // Load footer-specific CSS after the footer is inserted
      loadFooterStyles();
    })
    .catch(error => {
      console.error('Error loading footer component:', error);
    });
    
  // Function to dynamically load the footer styles
  function loadFooterStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/footer-styles.css';
    document.head.appendChild(link);
  }
})();