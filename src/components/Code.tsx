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
  const lang = codeLanguage || 'plaintext'
  const validLang = Prism.languages[lang] ? lang : 'plaintext'
  const safeText = typeof text === 'string' ? text : ''

  // Fix: Ensure we always have a valid grammar
  const grammar = Prism.languages[validLang] || Prism.languages['plaintext']!

  const highlightedCode = Prism.highlight(safeText, grammar, validLang)

  const copyCodeText = siteLanguage
    ? getLocalizedText(siteLanguage, 'copyCode')
    : 'Copy'
  const copiedText = siteLanguage
    ? getLocalizedText(siteLanguage, 'copied')
    : 'Copied!'

  return (
    <div className="code-snippet">
      <div className="code-panel">
        <p>{lang}</p>
        <button
          className="copy-code"
          onclick={`copyCode(this, '${copiedText}', '${copyCodeText}')`}
        >
          {copyCodeText}
        </button>
      </div>
      <pre>
        <code className={`language-${lang}`}>{highlightedCode}</code>
      </pre>
    </div>
  )
}
