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
  // Validate inputs
  const validLang = Prism.languages[lang] ? lang : 'plaintext'
  const safeText = typeof text === 'string' ? text : ''

  // Highlight code with Prism
  const highlightedCode = Prism.highlight(
    safeText,
    Prism.languages[validLang] || Prism.languages.plaintext,
    validLang
  )

  return (
    <div className="code-snippet">
      <div className="code-panel">
        <p>{lang}</p>
        <button className="copy-code">Copy code</button>
      </div>
      <pre>
        <code
          className={`language-${lang}`}
          dangerouslySetInnerHTML={{__html: highlightedCode}}
        />
      </pre>
    </div>
  )
}

export default CodeSnippet
