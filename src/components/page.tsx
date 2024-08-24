const ArrowComponent = () => (
  <a href="/" className="arrow-container">
    <div className="arrow">←</div>
  </a>
)

const LanguageSwitch = ({lang}: {lang: 'en' | 'ru'}) =>
  lang === 'en' ? <a href="/ru/">ru</a> : <a href="/">en</a>

const Page = ({
  title,
  content,
  lang = 'en',
  includeArrow = false
}: {
  title: string
  content: string
  lang: 'en' | 'ru'
  includeArrow: boolean
}): string => {
  return (
    <html lang={lang}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="stylesheet" href="/main.css" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="alternate" href="https://laidrivm.com/" hrefLang="en" />
        <link rel="alternate" href="https://laidrivm.com/ru/" hrefLang="ru" />
        <link
          rel="preload"
          href="/SourceCodePro-Regular.ttf.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/SourceSerif4-Regular.ttf.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/SourceSerif4-Semibold.ttf.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/SourceSerif4-It.ttf.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {includeArrow && <ArrowComponent />}
        <div className="language">
          <LanguageSwitch lang={lang} />
        </div>
        <div className="content" dangerouslySetInnerHTML={{__html: content}} />
      </body>
    </html>
  )
}

export default Page
