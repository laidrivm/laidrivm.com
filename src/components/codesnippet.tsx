import {useEffect, useRef} from 'preact/hooks'
import Prism from 'prismjs'

import type {CodeSnippetProps} from '../types.ts'

import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-docker'

/**
 * Renders a syntax-highlighted code snippet with a copy button
 *
 * @param props - Component properties
 * @returns JSX element with formatted code and copy functionality
 */
const CodeSnippet = ({lang, text}: CodeSnippetProps): JSX.Element => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const codeRef = useRef<HTMLElement>(null)

  // Validate inputs
  const validLang = Prism.languages[lang] ? lang : 'plaintext'
  const safeText = typeof text === 'string' ? text : ''

  // Highlight code with Prism
  const highlightedCode = Prism.highlight(
    safeText,
    Prism.languages[validLang] || Prism.languages.plaintext,
    validLang
  )

  useEffect(() => {
    const button = buttonRef.current
    const codeElement = codeRef.current

    if (!button || !codeElement) return

    const handleClick = async () => {
      try {
        await navigator.clipboard.writeText(codeElement.textContent || '')
        const originalText = button.textContent
        button.textContent = 'Copied!'

        setTimeout(() => {
          button.textContent = originalText
        }, 2000)
      } catch (err) {
        console.error('Failed to copy text:', err)
      }
    }

    button.addEventListener('click', handleClick)

    return () => {
      button.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <div className="code-snippet">
      <div className="code-panel">
        <p className="language-label">{validLang}</p>
        <button ref={buttonRef} className="copy-code">
          Copy code
        </button>
      </div>
      <pre>
        <code
          ref={codeRef}
          className={`language-${validLang}`}
          dangerouslySetInnerHTML={{__html: highlightedCode}}
        />
      </pre>
    </div>
  )
}

export default CodeSnippet
