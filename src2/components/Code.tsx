import Prism from 'prismjs'
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

import {getLocalizedText} from '../utils.ts'
import type {CodeProps} from '../types.ts'

export function Code({
  text,
  codeLanguage,
  siteLanguage
}: CodeProps): JSX.Element {
  const validLang = Prism.languages[codeLanguage] ? codeLanguage : 'plaintext'
  const safeText = typeof text === 'string' ? text : '' // maybe not the best option to validateInput...

  const highlightedCode = Prism.highlight(
    safeText,
    Prism.languages[validLang] || Prism.languages.plaintext,
    validLang
  )

  const copyCodeText = getLocalizedText(siteLanguage, 'copyCode')
  const copiedText = getLocalizedText(siteLanguage, 'copied')

  return (
    <div className="code-snippet">
      <div className="code-panel">
        <p>{codeLanguage}</p>
        <button
          className="copy-code"
          onclick={`copyCode(this, '${copiedText}', '${copyCodeText}')`}
        >
          {copyCodeText}
        </button>
      </div>
      <pre>
        <code className={`language-${codeLanguage}`}>{highlightedCode}</code>
      </pre>
    </div>
  )
}
