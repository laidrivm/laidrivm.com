import {marked} from 'marked'

import {ok, err} from '../utils.ts'
import type {
  ServiceResponse,
  FileCollection,
  MarkdownContent,
  SupportedLanguage,
  TokensList,
  PageTemplateProps
} from '../types.ts'

let wasPrintedOnce = false

const SUPPORTED_LANGUAGES = new Set<SupportedLanguage>(['en', 'ru'])

function renderPlaintext(markdown: string): string {
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

function defineLanguage(frontmatter: Object, path: string): SupportedLanguage {
  if (frontmatter?.language) {
    return frontmatter.language
  }
  const segments = path.replace(/^\//, '').split('/')
  if (segments.length > 0) {
    const firstSegment = segments[0].toLowerCase() as SupportedLanguage

    if (SUPPORTED_LANGUAGES.has(firstSegment)) {
      return firstSegment
    }
  }
  return 'en'
}

function extractFrontmatter(content: string): {
  frontmatter: Object
  markdown: string
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/)
  if (match) {
    const frontmatter = {}
    match[1].split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':')
      if (key) {
        frontmatter[key.trim()] = valueParts.join(':').trim()
      }
    })
    return {frontmatter, markdown: match[2]}
  }
  return {frontmatter: {}, markdown: content}
}

function getTitle(tokens: TokensList): string {
  for (const token of tokens) {
    if (token.type === 'heading') {
      return renderPlaintext(token.text).trim()
    }
  }
  return ''
}

function getDescription(tokens: TokensList): string {
  for (const token of tokens) {
    if (token.type === 'paragraph') {
      if (token.tokens && token.tokens.length > 0) {
        const hasNonImageContent = token.tokens.some(
          innerToken =>
            innerToken.type !== 'image' &&
            innerToken.type !== 'space' &&
            // Check for non-whitespace text tokens
            (innerToken.type !== 'text' || innerToken.raw.trim() !== '')
        )

        // If paragraph has actual text content, return it
        if (hasNonImageContent) {
          return renderPlaintext(token.text).trim()
        }
      } else if (token.text && token.text.trim() !== '') {
        // If no nested tokens but has text, return it
        return renderPlaintext(token.text).trim()
      }
    }
  }
  return ''
}

function getImage(tokens: TokensList): string {
  for (const token of tokens) {
    // Direct image token
    if (token.type === 'image') {
      return token.href
    }

    // Image might be inside a paragraph
    if (token.type === 'paragraph' && token.tokens) {
      for (const innerToken of token.tokens) {
        if (innerToken.type === 'image') {
          return innerToken.href
        }
      }
    }
    //ignore other cases
  }
  return '/og_image-min.jpg'
}

function getPageTemplateProps(
  frontmatter: Object,
  tokens: TokensList
): PageTemplateProps {
  return {
    title: frontmatter?.title || getTitle(tokens),
    description: frontmatter?.description || getDescription(tokens),
    image: frontmatter?.image || getImage(tokens)
  }
}

async function parseContent(
  content: string
): Promise<ServiceResponse<MarkdownContent>> {
  try {
    const {frontmatter, markdown} = extractFrontmatter(content)
    const tokens = marked.lexer(markdown)
    const pageTemplateProps = getPageTemplateProps(frontmatter, tokens)
    if (!wasPrintedOnce) {
      wasPrintedOnce = true
      console.log(tokens)
    }

    return ok({
      frontmatter,
      pageTemplateProps,
      tokens
    })
  } catch (error) {
    console.error(`Error parsing markdown file: ${error}`)
    return err(error)
  }
}

export async function parseMarkdown(
  scannerContent: ServiceResponse<FileCollection>
): Promise<ServiceResponse<FileCollection>> {
  if (!scannerContent.success) {
    return scannerContent
  }

  switch (scannerContent.data.mode) {
    case 'skip':
      console.log(`Skipping parsing markdown`)
      return ok({
        mode: 'skip'
      })
    case 'new':
    case 'all':
    case 'local':
      break
    default:
      return err(new Error('Unknown generation mode'))
  }

  const files = scannerContent.data.files
  const processedFiles = []
  for (const file of files) {
    if (file.type === 'markdown') {
      console.log(`Trying to parse ${file.localPath}`)
      const parsedFile = await parseContent(file.content)
      if (parsedFile.success) {
        processedFiles.push({
          ...file,
          content: parsedFile.data.tokens,
          frontmatter: parsedFile.data.frontmatter,
          pageTemplateProps: {
            ...parsedFile.data.pageTemplateProps,
            lang: defineLanguage(parsedFile.data.frontmatter, file.sourcePath)
          }
        })
      }
    } else {
      processedFiles.push(file)
    }
  }

  return ok({
    ...scannerContent.data,
    files: processedFiles
  })
}
