function zoomImage(img) {
  const wrapper = img.closest('.image-zoom-wrapper')

  // Toggle zoomed state
  wrapper.classList.toggle('zoomed');
          
  // Prevent page scrolling when zoomed
  if (img.classList.contains('zoomed')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'auto';
  }
}