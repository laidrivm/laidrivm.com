function copyCode(button, copyCodeText, copiedText) {
  const snippet = button.closest('.code-snippet')
  const code = snippet.querySelector('code').textContent

  if (code) {
    navigator.clipboard.writeText(code || '')
    button.textContent = copiedText
    setTimeout(() => {
      button.textContent = copyCodeText
    }, 2000)
  }
}