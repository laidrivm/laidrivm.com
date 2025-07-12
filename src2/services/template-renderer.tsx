import {join, dirname} from 'path'
import {mkdir} from 'node:fs/promises'

import {PageTemplate} from '../components/PageTemplate.tsx'
import {ok} from '../utils.ts'
import type {
  ServiceResponse,
  FileCollection,
  SupportedLanguage
} from '../types.ts'

let wasPrintedOnce = false

const DEFAULT_LANGUAGE: SupportedLanguage = 'en'
const VALID_LANGUAGES: SupportedLanguage[] = ['en', 'ru']

function getOutputPath(sourcePath: string): string {
  return join(process.env.PUBLIC_DIR, sourcePath.replace('.md', '.html'))
}

function getPageLang(path: string): SupportedLanguage {
  console.log(`getPageLang: ${path}`)

  if (!path || typeof path !== 'string') {
    console.warn(`Invalid path provided: ${path}`)
    return DEFAULT_LANGUAGE
  }

  const parts = path.replace(/\/+$/, '').split('/').filter(Boolean)

  // Default language for root and single-level paths
  if (parts.length <= 1) return DEFAULT_LANGUAGE

  // Check if second path segment is a valid language code
  const language = parts[1]
  console.log(`Language candidate: ${language}`)

  return VALID_LANGUAGES.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : DEFAULT_LANGUAGE
}

export async function renderPages(
  converterContent: ServiceResponse<FileCollection>
): Promise<ServiceResponse<FileCollection>> {
  if (!converterContent.success) {
    return converterContent
  }
  if (converterContent.data.mode === 'skip') {
    console.log(`Skipping rendering JSX into HTML`)
    return ok({
      mode: 'skip'
    })
  }
  const files = converterContent.data.files
  const processedFiles = []
  for (const file of files) {
    if (file.type === 'html') {
      const outputPath = getOutputPath(file.sourcePath)
      console.log(`Rendering page ${outputPath}`)

      const page = (
        <PageTemplate
          lang={file?.lang || getPageLang(outputPath)}
          title=""
          description=""
          time=""
          image=""
          address=""
        >
          {file.content}
        </PageTemplate>
      )

      processedFiles.push({
        ...file,
        outputPath,
        content: page
      })

      await mkdir(dirname(outputPath), {recursive: true})
      await Bun.write(outputPath, page)

      if (!wasPrintedOnce) {
        wasPrintedOnce = true
        console.log(page)
      }
    } else {
      processedFiles.push(file)
    }
  }

  return ok({
    ...converterContent.data,
    files: processedFiles
  })
}
