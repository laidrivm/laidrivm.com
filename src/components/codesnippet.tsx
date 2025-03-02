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

const CodeSnippet = ({lang, text}: {string; string}): JSX.Element => {
  const language = Prism.languages[lang] || Prism.languages.plaintext
  const highlightedCode = Prism.highlight(text, language, lang)

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
