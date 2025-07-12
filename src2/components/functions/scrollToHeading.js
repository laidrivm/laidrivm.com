function scrollToHeading() {
  const hash = window.location.hash
    if (!hash) return

    const targetLink = document.querySelector('a[href="' + hash + '"]')
    if (targetLink) {
      targetLink.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

window.addEventListener('load', scrollToHeading)
window.addEventListener('hashchange', scrollToHeading)
