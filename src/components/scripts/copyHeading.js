function copyHeading(button) {
  const heading = button.closest('.heading-content')
  const link = heading.querySelector('a').href

  if (link) {
    navigator.clipboard.writeText(link || '')
    button.textContent = '👍'
    setTimeout(() => {
      button.textContent = '🔗'
    }, 2000)
  }
}