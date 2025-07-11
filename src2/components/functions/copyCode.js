  function copyCode(button, copyCodeText, copiedText) {
    const snippet = button.closest('.code-snippet')
    const codeElement = snippet.querySelector('code')

    if (codeElement) {
      navigator.clipboard.writeText(codeElement.textContent || '')
      button.textContent = copiedText
      setTimeout(() => {
        button.textContent = copyCodeText
      }, 2000)
    }
  }