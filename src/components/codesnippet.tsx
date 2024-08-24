const CodeSnippet = ({lang, text}: {string; string}): string => {
  const id = 'language-'+lang;
  return (
  	<div class={id}>
  	  <pre class={`pre`}>
  	    <code class={`code`}>
  	      {text}
  	    </code>
  	  </pre>
  	</div>
  )
}

export default CodeSnippet
