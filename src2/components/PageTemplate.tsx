import type {PageTemplateProps} from '../types.ts'

import {Arrow} from './Arrow.tsx'

export function PageTemplate({
  lang = 'en',
  title,
  description,
  date,
  image,
  url,
  includeArrow = true,
  children
}: PageTemplateProps): JSX.Element {
  //const updateText = getLocalizedText('updated', validLang)
  //const formattedDate = formatDate(time, validLang)
  const formattedDate = date
  //const copyScript = createCopyScript(validLang)
  //const scrollScript = createScrollScript()
  //const zoomScript = createZoomScript()
  return (
    <>
      {'<!doctype html>'}
      <html lang={lang}>
        <head>
          <meta charSet="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>{title}</title>
          <meta name="author" content="Vladimir Lazarev" />
          <meta name="description" content={description} />
          <meta name="last-modified" content={date} />
          <meta property="og:image" content={image} />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <meta property="og:url" content={url} />
          <meta property="og:sitename" content="Vladimir Lazarev's Blog" />
          <meta property="og:type" content="website" />
          <link rel="canonical" href={url} />
          <link rel="stylesheet" href="/main.css" />
          <link rel="icon" type="image/png" href="/favicon.png" />
          <link rel="alternate" href="https://laidrivm.com/" hrefLang="en" />
          <link rel="alternate" href="https://laidrivm.com/ru/" hrefLang="ru" />
          <link
            rel="preload"
            href="/fonts/SourceCodePro-Regular.ttf.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/fonts/SourceSerif4-Regular.ttf.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/fonts/SourceSerif4-Semibold.ttf.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/fonts/SourceSerif4-It.ttf.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        </head>
        <body>
          {includeArrow && <Arrow lang={lang} />}
          {/* <LanguageSwitch lang={lang} /> */}

          <main className="content">
            {children}
            <div className="social">
              {/* <SharingLinks lang={lang} url={url} text={description} /> */}
              <p>
                {/* {updateText} */}
                Updated at:
                <time dateTime={date}>{formattedDate}</time>
              </p>
            </div>
          </main>
          <script src="/copyCode.js" defer></script>
        </body>
      </html>
    </>
  )
}
