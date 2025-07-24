import {join, dirname} from 'path'
import {mkdir} from 'node:fs/promises'

import {PageTemplate} from '../components/PageTemplate.tsx'
import {ArticlesFeed} from '../components/ArticlesFeed.tsx'
import {ok, isIndex} from '../utils.ts'
import type {
  ServiceResponse,
  FileCollection,
  FileInfo,
  SupportedLanguage
} from '../types.ts'

import {typographyText} from './typography.ts'

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

export interface ArticleLink {
  sourcePath: string
  slug: string
  title?: string
  description?: string
  image?: string
  date?: Date
  lang?: SupportedLanguage
}

function typographLinks(
  links: ArticleLink[],
  lang: SupportedLanguage
): ArticleLink[] {
  let result = [] as ArticleLink[]
  for (const link of links) {
    result.push({
      ...link,
      title: typographyText(link.title, lang),
      description: typographyText(link.description, lang)
    })
  }
  return result
}

/**
 * Renders a single page with the PageTemplate
 */
function renderPage(file: FileInfo): JSX.Element {
  const isIndexPage = isIndex(file.sourcePath)

  if (!file.pageTemplateProps) {
    throw new Error(`No page template props for ${file.sourcePath}`)
  }
  const lang = file.pageTemplateProps.lang || 'en'

  const pageProps = {
    lang,
    title: file.pageTemplateProps.title,
    description: file.pageTemplateProps.description,
    image: file.pageTemplateProps.image,
    updatedAt: file.lastModified,
    url: generatePageUrl(file.sourcePath),
    includeArrow: !isIndex(file.sourcePath)
  }

  const content = file.content as JSX.Element
  const articlesFeed =
    isIndexPage && file.articleLinks ? (
      <ArticlesFeed
        lang={lang}
        links={typographLinks(file.articleLinks, lang)}
      />
    ) : null

  return (
    <PageTemplate {...pageProps}>
      {content}
      {articlesFeed || <></>}
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

  // Convert JSX to string for Bun.write
  const htmlString = content.toString()
  await Bun.write(outputPath, htmlString)
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
 * Generates a sitemap entry for a rendered page
 */
function generateSitemapEntry(file: FileInfo): string {
  if (file.type !== 'html') return ''

  const url = generatePageUrl(file.sourcePath)
  const lastmod = file.lastModified.toISOString().replace(/\.\d{3}Z$/, 'Z')
  let priority = 0.7
  if (isIndex(file.sourcePath)) {
    priority += 0.2
  }
  if (file.pageTemplateProps.lang === 'en') {
    priority += 0.1
  }
  priority = parseFloat(priority.toFixed(1))

  return `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priority}</priority>
  </url>`
}

async function writeSitemap(sitemapEntries: string): Promise<void> {
  const sitemap = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">${sitemapEntries}
</urlset>`

  const publicDir = process.env['PUBLIC_DIR'] || 'public'
  const sitemapPath = join(publicDir, 'sitemap.xml')

  await Bun.write(sitemapPath, sitemap)
}

/**
 * Processes all files in the collection
 */
async function processAllFiles(files: FileInfo[]): Promise<FileInfo[]> {
  const processedFiles: FileInfo[] = []

  let sitemapEntries = ``

  for (const file of files) {
    if (file.type === 'html') {
      const processedFile = await processHTMLFile(file)
      processedFiles.push(processedFile)
      sitemapEntries += generateSitemapEntry(file)
    } else {
      // Pass through non-HTML files unchanged
      processedFiles.push(file)
    }
  }

  await writeSitemap(sitemapEntries)

  return processedFiles
}

/**
 * Main render function that orchestrates the page rendering process
 */
export async function renderPages(
  converterContent: ServiceResponse<FileCollection>
): Promise<ServiceResponse<FileCollection>> {
  if (!converterContent.success || !converterContent.data) {
    return converterContent
  }

  if (converterContent.data.mode === 'skip') {
    console.log(`Skipping rendering JSX into HTML`)
    return ok({
      files: [],
      lastFetch: null,
      repoSha: null,
      mode: 'skip'
    })
  }

  const processedFiles = await processAllFiles(converterContent.data.files)

  return ok({
    ...converterContent.data,
    files: processedFiles
  })
}
