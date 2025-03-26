import {marked} from 'marked'
import {renderToString} from 'preact-render-to-string'
import unidecode from 'unidecode'

import type {SupportedLanguage} from '../types.ts'

import Heading from './components/heading.tsx'
import CodeSnippet from './components/codesnippet.tsx'
import Image from './components/image.tsx'

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

  return marked(markdown, {renderer})
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
 * Extracts the first image URL from markdown
 * @param markdown - Markdown content
 * @returns Extracted image URL or default
 */
export function extractOGImage(markdown: string): string {
  const lines = markdown.split('\n')
  const defaultImage = '/og_image-min.jpg'

  for (const line of lines) {
    const match = /!\[.*?\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g.exec(line)
    if (match) {
      return match[1]
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
        } else {
          return `<p>${this.parser.parseInline(tokens)}</p>\n`
        }
      }
    }
  })

  return marked.parse(markdown)
}
