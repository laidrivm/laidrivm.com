import {marked} from 'marked'

import {ok, err} from '../utils.ts'
import type {
  ServiceResponse,
  FileCollection,
  MarkdownContent
} from '../types.ts'

let wasPrintedOnce = false

function extractFrontmatter(content) {
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

async function parseContent(
  content: string
): Promise<ServiceResponse<MarkdownContent>> {
  try {
    const {frontmatter, markdown} = extractFrontmatter(content)
    const tokens = marked.lexer(markdown)
    if (!wasPrintedOnce) {
      wasPrintedOnce = true
      console.log(tokens)
    }

    return ok({
      frontmatter,
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
          frontmatter: parsedFile.data.frontmatter
        })
      }
    } else {
      processedFiles.push(file)
    }
  }

  return ok({
    files: processedFiles,
    lastFetch: scannerContent.data.lastFetch,
    repoSha: scannerContent.data.repoSha,
    mode: scannerContent.data.mode
  })
}
