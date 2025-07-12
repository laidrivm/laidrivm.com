function zoomImage(img) {
  // Toggle zoomed state
  img.classList.toggle('zoomed');
          
  // Prevent page scrolling when zoomed
  if (img.classList.contains('zoomed')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'auto';
  }
}