import {Marked} from 'marked'
import {markedTypograf} from 'marked-typograf'
import {renderToString} from 'preact-render-to-string'
import unidecode from 'unidecode'
import {parseFragment, serialize} from 'parse5'
import type {ChildNode} from 'parse5'

import type {SupportedLanguage} from '../types.ts'

import Heading from './components/heading.tsx'
import CodeSnippet from './components/codesnippet.tsx'
import Image from './components/image.tsx'

function setNoHyphens(nodes: ChildNode): void {
  nodes.forEach(node => {
    if (node.nodeName === '#text') {
      if (!node.value.trim()) return

      // Match last word, capturing leading spaces if any
      let match = node.value.match(/(\s+)(\S+[\w\p{P}])$|(\S+[\w\p{P}])$/u)
      if (match) {
        const spaces = match[1] || '' // Capture leading spaces
        const word = match[2] || match[3] // Capture last word

        if (spaces && node.value.trim().includes(' ')) {
          node.value = node.value.slice(0, -match[0].length) + '\u00A0'
        } else {
          node.value = node.value.slice(0, -match[0].length)
        }

        const spanElement = parseFragment(
          `<span class="no-hyphens">${word}</span>`
        ).childNodes[0]
        const parent = node.parentNode
        const index = parent.childNodes.indexOf(node)
        parent.childNodes.splice(index + 1, 0, spanElement)
      }

      // Match URLs (not inside attributes)
      node.value = node.value.replace(
        /(https?:\/\/[^\s]+)/g,
        '<span class="no-hyphens">$1</span>'
      )
    } else if (node.childNodes && !['code', 'pre'].includes(node.nodeName)) {
      setNoHyphens(node.childNodes)
    }
  })
}

/**
 * Generates a URL-friendly ID from text with transliteration
 * @param text - Original text
 * @returns URL-friendly slug
 */
export function generateId(text: string): string {
  const transliterated = unidecode(text)

  return transliterated
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Extracts the title from a markdown document
 * @param markdown - Markdown content
 * @returns Extracted title or default
 */
export function extractTitle(markdown: string): string {
  const lines = markdown.split('\n')
  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.replace('# ', '')
    }
  }
  return 'Untitled'
}

/**
 * Converts markdown to plain text, stripping HTML and formatting
 * @param markdown - Markdown content
 * @returns Plain text content
 */
export function convertToPlaintext(markdown: string): string {
  const marked = new Marked()
  const renderer = new marked.Renderer()

  renderer.text = token => token.text
  renderer.link = token => token.text
  renderer.paragraph = token => {
    let result = ''
    for (const innerToken of token.tokens) {
      switch (innerToken.type) {
        case 'link':
          result += renderer.link(innerToken)
          break
        case 'text':
          result += renderer.text(innerToken)
          break
        default:
          throw new Error(`Unsupported token type: ${innerToken.type}`)
      }
    }
    return result
  }

  return marked.parse(markdown, {renderer})
}

/**
 * Extracts the first line of text as a description
 * @param markdown - Markdown content
 * @returns Extracted description or empty string
 */
export function extractDescription(markdown: string): string {
  const lines = markdown.split('\n')
  for (const line of lines) {
    if (/^\p{L}/u.test(line)) {
      return convertToPlaintext(line)
    }
  }
  return ''
}

/**
 * Extracts the first relative image URL from markdown
 * @param markdown - Markdown content
 * @returns Extracted image URL or default
 */
export function extractOGImage(markdown: string): string {
  const lines = markdown.split('\n')
  const defaultImage = '/og_image-min.jpg'

  for (const line of lines) {
    const match = /!\[.*?\]\(((?!https?:\/\/)[^\s)]+)(?:\s+"[^"]*")?\)/.exec(
      line
    )
    if (match) {
      return match[1] // Return the first found relative image path
    }
  }

  return defaultImage
}

/**
 * Converts markdown to HTML with custom rendering
 * @param markdown - Markdown content
 * @param uiLanguage - The language page should be rendered in
 * @returns HTML content
 */
export function convertToHtml(
  markdown: string,
  uiLanguage: SupportedLanguage
): string {
  const marked = new Marked()
  let isFirstParagraph = true

  marked.use({
    renderer: {
      heading({tokens, depth}) {
        // Parse the inline tokens to get the text
        const text = this.parser.parseInline(tokens)

        const id = generateId(text)

        return renderToString(<Heading depth={depth} text={text} id={id} />)
      },

      code({text, lang}) {
        return renderToString(
          <CodeSnippet
            codeLanguage={lang || 'plaintext'}
            text={text}
            siteLanguage={uiLanguage}
          />
        )
      },

      image({text, href, title}) {
        return renderToString(<Image src={href} alt={text || title || ''} />)
      },

      paragraph({tokens}) {
        if (tokens[0].type === 'image') {
          const caption =
            tokens.length > 2 && tokens[2].type === 'em' ? tokens[2].text : ''
          return renderToString(
            <Image
              src={tokens[0].href}
              alt={tokens[0].text || tokens[0].title || ''}
              caption={caption}
            />
          )
        } else if (isFirstParagraph) {
          isFirstParagraph = false
          return `<div class="lead"><p>${this.parser.parseInline(tokens)}</p></div>\n`
        }
        return `<p>${this.parser.parseInline(tokens)}</p>\n`
      }
    }
  })

  const options = {
    typografOptions: {
      locale: uiLanguage === 'en' ? 'en-US' : 'ru'
    },
    typografSetup: tp => {
      tp.addSafeTag('<code>', '</code>')
      tp.addSafeTag('<pre>', '</pre>')
      tp.enableRule('common/space/delLeadingBlanks')
      tp.enableRule('common/number/digitGrouping')
      tp.enableRule('common/nbsp/afterNumber')
      tp.setSetting('common/nbsp/afterShortWord', 'lengthShortWord', 2)
      tp.disableRule('common/nbsp/nowrap')
      tp.disableRule('common/nbsp/replaceNbsp')
      tp.enableRule('common/html/processingAttrs')
      //tp.setSetting('common/html/processingAttrs', 'attrs', ['title', 'alt'])
      //turns pre code into privatesymbol 
    },
    customRules: [
      {
        name: 'common/other/lastWordNoHypens',
        handler: function (text, _settings, context) {
          if (context.isHTML) {
            const document = parseFragment(text)
            setNoHyphens(document.childNodes)
            return serialize(document)
          }
          return text
        },
        locale: 'common',
        queue: 'end',
        enabled: true,
        processingSeparateParts: false
      }
    ]
  }

  marked.use(markedTypograf(options))

  return marked.parse(markdown)
}
