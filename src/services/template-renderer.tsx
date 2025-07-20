import {join, dirname} from 'path'
import {mkdir} from 'node:fs/promises'

import {PageTemplate} from '../components/PageTemplate.tsx'
import {ArticlesFeed} from '../components/ArticlesFeed.tsx'
import {ok, isIndex} from '../utils.ts'
import type {ServiceResponse, FileCollection, FileInfo} from '../types.ts'

let wasPrintedOnce = false

/**
 * Generates the canonical URL for a page
 */
function generatePageUrl(sourcePath: string): string {
  const baseUrl = process.env['BASE_URL'] || 'localhost'
  const urlPath = sourcePath
    .replace('.md', '')
    .replace(/\/index$/, '/') // Remove 'index' from URL
    .replace(/^index$/, '') // Handle root index

  return `https://${baseUrl}/${urlPath}`
}

/**
 * Determines the output path based on the source path
 * Creates directory structure for clean URLs
 */
function determineOutputPath(sourcePath: string): string {
  const publicDir = process.env['PUBLIC_DIR'] || 'public'
  const nameWithoutExt = sourcePath.replace('.md', '')

  if (nameWithoutExt.endsWith('index') || nameWithoutExt === 'index') {
    // Keep index files as index.html in their directory
    return join(publicDir, nameWithoutExt + '.html')
  } else {
    // Create directory with index.html for clean URLs
    return join(publicDir, nameWithoutExt, 'index.html')
  }
}

/**
 * Renders a single page with the PageTemplate
 */
function renderPage(file: FileInfo): JSX.Element {
  const isIndexPage = isIndex(file.sourcePath)

  return (
    <PageTemplate
      lang={file.pageTemplateProps.lang}
      title={file.pageTemplateProps.title}
      description={file.pageTemplateProps.description}
      image={file.pageTemplateProps.image}
      updatedAt={file.lastModified}
      url={generatePageUrl(file.sourcePath)}
      includeArrow={!isIndex(file.sourcePath)}
    >
      {file.content}
      {isIndexPage && file.articleLinks && (
        <ArticlesFeed
          lang={file.pageTemplateProps.lang}
          links={file.articleLinks}
        />
      )}
    </PageTemplate>
  )
}

/**
 * Writes the rendered page to the file system
 */
async function writePage(
  outputPath: string,
  content: JSX.Element
): Promise<void> {
  const outputDir = dirname(outputPath)
  await mkdir(outputDir, {recursive: true})
  await Bun.write(outputPath, content)
}

/**
 * Processes a single HTML file
 */
async function processHTMLFile(file: FileInfo): Promise<FileInfo> {
  const outputPath = determineOutputPath(file.sourcePath)
  console.log(`Rendering page ${file.sourcePath} → ${outputPath}`)

  // Render the page
  const renderedPage = renderPage(file)

  // Write to file system
  await writePage(outputPath, renderedPage)

  if (!wasPrintedOnce) {
    wasPrintedOnce = true
    console.log(file.content)
  }

  // Return updated file info
  return {
    ...file,
    outputPath,
    content: renderedPage
  }
}

/**
 * Processes all files in the collection
 */
async function processAllFiles(files: FileInfo[]): Promise<FileInfo[]> {
  const processedFiles: FileInfo[] = []

  for (const file of files) {
    if (file.type === 'html') {
      const processedFile = await processHTMLFile(file)
      processedFiles.push(processedFile)
    } else {
      // Pass through non-HTML files unchanged
      processedFiles.push(file)
    }
  }

  return processedFiles
}

/**
 * Main render function that orchestrates the page rendering process
 */
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

  const processedFiles = await processAllFiles(converterContent.data.files)

  return ok({
    ...converterContent.data,
    files: processedFiles
  })
}

// ===== Additional utility functions =====

/**
 * Generates a sitemap entry for a rendered page
 */
export function generateSitemapEntry(file: FileInfo): string {
  if (file.type !== 'html') return ''

  const url = generatePageUrl(file.sourcePath)
  const lastmod = file.lastModified.toISOString().split('T')[0]

  return `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${isIndex(file.sourcePath) ? '1.0' : '0.8'}</priority>
  </url>`
}
