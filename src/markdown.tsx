import {marked} from 'marked'
import {renderToString} from 'preact-render-to-string'

import Heading from './components/heading.tsx'
import CodeSnippet from './components/codesnippet.tsx'

/**
 * Extracts the title from a markdown document
 * Looks for the first line starting with '# '
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
 */
export function convertToPlaintext(markdown: string): string {
  const renderer = new marked.Renderer()

  renderer.text = text => text.text
  renderer.link = link => link.text
  renderer.paragraph = paragraph => {
    let result = ''
    for (const token of paragraph.tokens) {
      switch (token.type) {
        case 'link':
          result += renderer.link(token)
          break
        case 'text':
          result += renderer.text(token)
          break
        default:
          throw new Error(`Unsupported token type: ${token.type}`)
      }
    }
    return result
  }

  return marked(markdown, {renderer})
}

/**
 * Extracts the first line of text as a description
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
 * Generates a URL-friendly ID from text
 */
export function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Converts markdown to HTML with custom rendering
 */
export function convertToHtml(markdown: string): string {
  const renderer = new marked.Renderer()

  renderer.heading = header => {
    return renderToString(
      <Heading
        depth={header.depth}
        text={header.text}
        id={generateId(header.text)}
      />
    )
  }

  renderer.code = code => {
    return renderToString(
      <CodeSnippet lang={code.lang || 'plaintext'} text={code.text} />
    )
  }

  return marked(markdown, {renderer})
}
