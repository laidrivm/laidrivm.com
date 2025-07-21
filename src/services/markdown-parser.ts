import {marked} from 'marked'

import {ok, err} from '../utils.ts'
import type {
  ServiceResponse,
  FileCollection,
  MarkdownContent,
  SupportedLanguage,
  TokensList,
  PageTemplateProps,
  ArticleLink,
  FileInfo
} from '../types.ts'

let wasPrintedOnce = false

const SUPPORTED_LANGUAGES = new Set<SupportedLanguage>(['en', 'ru'])

function renderPlaintext(markdown: string): string {
  const renderer = new marked.Renderer()

  renderer.text = (token: any) => token.text || token
  renderer.link = (token: any) => token.text || ''
  renderer.paragraph = (token: any) => {
    let result = ''
    if (token.tokens) {
      for (const innerToken of token.tokens) {
        switch (innerToken.type) {
          case 'link':
            result += renderer.link(innerToken)
            break
          case 'text':
            result += renderer.text(innerToken)
            break
          default:
            result += innerToken.text || ''
        }
      }
    } else {
      result = token.text || ''
    }
    return result
  }

  return marked.parse(markdown, {renderer}) as string
}

function defineLanguage(
  frontmatter: Record<string, any>,
  path: string
): SupportedLanguage {
  if (
    frontmatter?.['language'] &&
    SUPPORTED_LANGUAGES.has(frontmatter['language'])
  ) {
    return frontmatter['language']
  }
  const segments = path.replace(/^\//, '').split('/')
  if (segments.length > 0 && segments[0]) {
    const firstSegment = segments[0].toLowerCase() as SupportedLanguage

    if (SUPPORTED_LANGUAGES.has(firstSegment)) {
      return firstSegment
    }
  }
  return 'en'
}

function extractFrontmatter(content: string): {
  frontmatter: Record<string, any>
  markdown: string
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/)
  if (match && match[1] && match[2]) {
    const frontmatter: Record<string, any> = {}
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
    if (token.type === 'heading' && 'text' in token) {
      return renderPlaintext(token.text).trim()
    }
  }
  return ''
}

function getDescription(tokens: TokensList): string {
  for (const token of tokens) {
    if (token.type === 'paragraph' && 'text' in token) {
      if ('tokens' in token && token.tokens && token.tokens.length > 0) {
        const hasNonImageContent = token.tokens.some(
          (innerToken: any) =>
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
    if (token.type === 'image' && 'href' in token) {
      return token.href
    }

    // Image might be inside a paragraph
    if (token.type === 'paragraph' && 'tokens' in token && token.tokens) {
      for (const innerToken of token.tokens) {
        if (innerToken.type === 'image' && 'href' in innerToken) {
          return innerToken.href
        }
      }
    }
    //ignore other cases
  }
  return '/og_image-min.jpg'
}

function getPageTemplateProps(
  frontmatter: Record<string, any>,
  tokens: TokensList
): PageTemplateProps {
  return {
    title: frontmatter?.['title'] || getTitle(tokens) || '',
    description: frontmatter?.['description'] || getDescription(tokens) || '',
    image: frontmatter?.['image'] || getImage(tokens) || '/og_image-min.jpg'
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
    return err(error as Error)
  }
}

/**
 * Parses a single markdown file
 */
async function parseMarkdownFile(file: FileInfo): Promise<FileInfo> {
  if (file.type !== 'markdown') {
    return file
  }

  console.log(`Trying to parse ${file.localPath}`)
  if (!file.content || typeof file.content !== 'string') {
    console.error(`File ${file.localPath} has no string content`)
    return file
  }

  const parsedFile = await parseContent(file.content)

  if (!parsedFile.success || !parsedFile.data) {
    console.error(`Failed to parse ${file.localPath}`)
    return file
  }

  const lang = defineLanguage(parsedFile.data.frontmatter, file.sourcePath)

  return {
    ...file,
    content: parsedFile.data.tokens,
    frontmatter: parsedFile.data.frontmatter,
    pageTemplateProps: {
      title: parsedFile.data.pageTemplateProps?.title || '',
      description: parsedFile.data.pageTemplateProps?.description || '',
      image: parsedFile.data.pageTemplateProps?.image || '/og_image-min.jpg',
      lang,
      children: [] as JSX.Element[],
      updatedAt: file.lastModified,
      url: '',
      includeArrow: false
    }
  }
}

/**
 * Parses all markdown files in parallel
 */
async function parseAllMarkdownFiles(files: FileInfo[]): Promise<FileInfo[]> {
  return Promise.all(files.map(parseMarkdownFile))
}

/**
 * Creates a lookup map of files by their source path
 */
function createFileMap(files: FileInfo[]): Map<string, FileInfo> {
  const fileMap = new Map<string, FileInfo>()
  files.forEach(file => {
    fileMap.set(file.sourcePath, file)
  })
  return fileMap
}

/**
 * Enriches a single article link with metadata from the parsed file
 */
function enrichArticleLink(
  link: ArticleLink,
  fileMap: Map<string, FileInfo>
): ArticleLink {
  const articleFile = fileMap.get(link.sourcePath)

  if (!articleFile?.pageTemplateProps) {
    return link
  }

  return {
    ...link,
    title: articleFile.pageTemplateProps.title,
    description: articleFile.pageTemplateProps.description,
    image: articleFile.pageTemplateProps.image,
    lang: articleFile.pageTemplateProps.lang
  }
}

/**
 * Sorts article links by date (newest first)
 */
function sortArticleLinksByDate(links: ArticleLink[]): ArticleLink[] {
  return [...links].sort((a, b) => {
    const dateA = a.date || new Date(0)
    const dateB = b.date || new Date(0)
    return dateB.getTime() - dateA.getTime()
  })
}

/**
 * Enriches article links for a single file
 */
function enrichFileArticleLinks(
  file: FileInfo,
  fileMap: Map<string, FileInfo>
): FileInfo {
  if (!file.articleLinks || file.articleLinks.length === 0) {
    return file
  }

  const enrichedLinks = file.articleLinks.map(link =>
    enrichArticleLink(link, fileMap)
  )

  const sortedLinks = sortArticleLinksByDate(enrichedLinks)

  return {
    ...file,
    articleLinks: sortedLinks
  }
}

/**
 * Enriches all files that have article links
 */
function enrichAllArticleLinks(
  files: FileInfo[],
  fileMap: Map<string, FileInfo>
): FileInfo[] {
  return files.map(file => enrichFileArticleLinks(file, fileMap))
}

export async function parseMarkdown(
  scannerContent: ServiceResponse<FileCollection>
): Promise<ServiceResponse<FileCollection>> {
  if (!scannerContent.success || !scannerContent.data) {
    return scannerContent
  }

  switch (scannerContent.data.mode) {
    case 'skip':
      console.log(`Skipping parsing markdown`)
      return scannerContent
    case 'new':
    case 'all':
    case 'local':
      break
    default:
      return err(new Error('Unknown generation mode'))
  }

  const {files} = scannerContent.data

  // First pass: parse all markdown files
  const parsedFiles = await parseAllMarkdownFiles(files)

  // Create a map for quick lookup
  const fileMap = createFileMap(parsedFiles)

  // Second pass: enrich article links with parsed data
  const enrichedFiles = enrichAllArticleLinks(parsedFiles, fileMap)

  return ok({
    ...scannerContent.data,
    files: enrichedFiles
  })
}
