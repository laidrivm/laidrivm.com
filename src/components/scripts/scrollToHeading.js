function scrollToHeading() {
  const hash = window.location.hash;
  if (!hash) return;
  
  const targetId = hash.substring(1);
  const targetElement = document.getElementById(targetId);
  
  const scrollIntoViewOptions = {
    behavior: 'smooth',
    block: 'start'
  };
  
  if (targetElement) {
    targetElement.scrollIntoView(scrollIntoViewOptions);
  }
}

// Handle clicks on anchor links
function handleAnchorClick(e) {
  // Check if the clicked element is an anchor link pointing to the same page
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  
  e.preventDefault(); // Prevent the default jump behavior
  
  const hash = link.getAttribute('href');
  const targetId = hash.substring(1);
  const targetElement = document.getElementById(targetId);
  
  if (targetElement) {
    // Update the URL hash without triggering default behavior
    history.pushState(null, null, hash);
    
    // Smooth scroll to the target
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

// Listen for page load
window.addEventListener('load', scrollToHeading);

// Listen for clicks on the entire document
document.addEventListener('click', handleAnchorClick);

// Optional: Still listen for hashchange in case the hash is changed programmatically
window.addEventListener('hashchange', scrollToHeading);
