const CodeSnippet = ({lang, text}: {string; string}): string => {
  const id = 'language-' + lang
  return (
    <div className={id}>
      <pre className={`pre`}>
        <code className={`code`}>{text}</code>
      </pre>
    </div>
  )
}

export default CodeSnippet
