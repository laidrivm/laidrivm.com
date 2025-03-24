import type {PageProps, SupportedLanguage} from '../types.ts'

import {
  formatDate,
  getLocalizedText,
  isValidLanguage
} from './utils.ts'
import Arrow from './arrow.tsx'
import LanguageSwitch from './languageswitch.tsx'

/**
 * Creates the client-side script for code snippet copy functionality
 *
 * @param lang - Current language for localization
 * @returns JavaScript code as a string
 */
function createCopyScript(lang: SupportedLanguage): string {
  const copyText = getLocalizedText('copyCode', lang)
  const copiedText = getLocalizedText('copied', lang)

  return `
    document.addEventListener('DOMContentLoaded', () => {
      const codeSnippets = document.querySelectorAll('.code-snippet');
      codeSnippets.forEach(snippet => {
        const button = snippet.querySelector('.copy-code');
        if (!button) return;
        
        button.addEventListener('click', () => {
          const codeElement = snippet.querySelector('code');
          if (codeElement) {
            navigator.clipboard.writeText(codeElement.textContent || '');
            button.textContent = '${copiedText}';
            setTimeout(() => {
              button.textContent = '${copyText}';
            }, 2000);
          }
        });
      });
    });
  `
}

/**
 * Renders a complete HTML page with metadata and content
 *
 * @param props - Page component properties
 * @returns JSX element representing a complete HTML document
 */
const Page = ({
  address,
  title,
  description,
  content,
  image,
  time,
  lang = 'en',
  includeArrow = false
}: PageProps): JSX.Element => {
  // Validate language
  const validLang = isValidLanguage(lang) ? lang : 'en'

  // Format the update text and date
  const updateText = getLocalizedText('updated', validLang)
  const formattedDate = formatDate(time, validLang)

  // Create copy script
  const copyScript = createCopyScript(validLang)

  return (
    <html lang={validLang}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <meta name="author" content="Vladimir Lazarev" />
        <meta name="description" content={description} />
        <meta name="last-modified" content={time} />
        <meta property="og:image" content={image} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={address} />
        <meta property="og:sitename" content="Vladimir Lazarev's Page" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={address} />
        <link rel="stylesheet" href="/main.css" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="alternate" href="https://laidrivm.com/" hrefLang="en" />
        <link rel="alternate" href="https://laidrivm.com/ru/" hrefLang="ru" />
        <link
          rel="preload"
          href="fonts/SourceCodePro-Regular.ttf.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="fonts/SourceSerif4-Regular.ttf.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="fonts/SourceSerif4-Semibold.ttf.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="fonts/SourceSerif4-It.ttf.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {includeArrow && <Arrow lang={validLang} />}
        <div className="language">
          <LanguageSwitch lang={validLang} />
        </div>
        <div className="content" dangerouslySetInnerHTML={{__html: content}} />
        <script dangerouslySetInnerHTML={{__html: copyScript}} />
        <div className="social">
          <p>
            {updateText}
            <time dateTime={time}>{formattedDate}</time>
          </p>
        </div>
      </body>
    </html>
  )
}

export default Page
