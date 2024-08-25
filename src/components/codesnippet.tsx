import Prism from 'prismjs'
import loadLanguages from 'prismjs/components/index.js'
import 'prismjs/components/prism-markup.js'


loadLanguages()

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
