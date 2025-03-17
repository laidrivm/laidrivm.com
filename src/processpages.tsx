import {join} from 'path'
import {mkdir} from 'node:fs/promises'

import {renderToString} from 'preact-render-to-string'
import xss from 'xss'

import customWhiteList from './xssconfig.ts'
import Page from './components/page.tsx'
import ArticleList from './components/articlelist.tsx'
import * as MarkdownUtils from './markdown.tsx'
import type {SupportedLanguage, FileNode, Links} from './types'

const XSS_OPTIONS = {
  whiteList: customWhiteList
}

/**
 * Determines the language of a given path
 */
export function getLanguageFromPath(path: string): SupportedLanguage {
  if (!path || typeof path !== 'string') {
    console.warn(`Invalid path provided: ${path}`)
    return 'en'
  }

  const validLanguages: SupportedLanguage[] = ['en', 'ru', 'es', 'fr']
  const parts = path.replace(/\/+$/, '').split('/').filter(Boolean)

  if (parts.length <= 1) return 'en'

  const language = parts[1]
  return validLanguages.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : 'en'
}

/**
 * Generates a canonical page address
 */
export function generatePageAddress(
  language: SupportedLanguage,
  baseFileName: string
): string {
  const baseUrl = `https://${process.env.ADDRESS}`
  return language === 'en'
    ? `${baseUrl}/${baseFileName}`
    : `${baseUrl}/${language}/${baseFileName}`
}

/**
 * Determines if a directory name corresponds to one of the supported language
 */
export function isLanguageDirectory(path: string): boolean {
  const validLanguages: SupportedLanguage[] = ['en', 'ru', 'es', 'fr']
  const parts = path.replace(/\/+$/, '').split('/').filter(Boolean)

  const candidate = parts[parts.length - 1]
  return validLanguages.includes(candidate as SupportedLanguage)
}

/**
 * Generates an HTML page from a markdown file
 */
export async function generateHtmlPage(
  address: string,
  mdPath: string,
  outputPath: string,
  language: SupportedLanguage,
  time: string,
  includeArrow = false,
  links: Links = []
): Promise<string | null> {
  try {
    const file = Bun.file(mdPath)

    if (!(await file.exists())) {
      console.warn(`Markdown file not found: ${mdPath}`)
      return null
    }

    const markdown = await file.text()
    const contentHtml = xss(MarkdownUtils.convertToHtml(markdown), XSS_OPTIONS)

    const title = MarkdownUtils.extractTitle(markdown)
    const description = MarkdownUtils.extractDescription(markdown)
    const image = MarkdownUtils.extractOGImage(markdown)

    const linksHtml = links.length
      ? renderToString(<ArticleList links={links} />)
      : ''

    const fullJsx = (
      <Page
        address={address}
        title={title}
        description={description}
        content={`${contentHtml}${linksHtml}`}
        image={image}
        time={time}
        lang={language}
        includeArrow={includeArrow}
      />
    )

    const html = '<!DOCTYPE html>\n' + renderToString(fullJsx)
    await Bun.write(outputPath, html)

    console.log(`Page generated successfully: ${outputPath} (Title: ${title})`)
    return title
  } catch (error) {
    console.error(`Error generating page: ${error}`)
    return null
  }
}

/**
 * Sort articles by creation time (newest first), fall back to alphabetical
 */
function sortArticlesByCreationTime(articles: FileNode[]): FileNode[] {
  return [...articles].sort((a, b) => {
    const dateA = new Date(a.created)
    const dateB = new Date(b.created)

    // Sort by creation date (newest first)
    if (dateB.getTime() !== dateA.getTime()) {
      return dateB.getTime() - dateA.getTime()
    }

    // Fall back to alphabetical sorting
    return a.name.localeCompare(b.name)
  })
}

/**
 * Process folders recursively
 */
async function processFolders(
  sourcePath: string,
  destinationPath: string,
  folders: FileNode[]
): Promise<void> {
  for (const folder of folders) {
    await processPages(
      join(sourcePath, folder.name),
      join(destinationPath, folder.name),
      folder
    )
  }
}

/**
 * Process articles and build links
 */
async function processArticles(
  sourcePath: string,
  destinationPath: string,
  articles: FileNode[],
  language: SupportedLanguage
): Promise<{links: Links; mostRecentEdit: string}> {
  let mostRecentEdit = ''
  const links: Links = []

  for (const article of articles) {
    const address = generatePageAddress(language, article.name)
    const title = await generateHtmlPage(
      address,
      join(sourcePath, article.name + '.md'),
      join(destinationPath, article.name, 'index.html'),
      language,
      article.edited,
      true
    )

    if (title) {
      links.push({
        text: title,
        address
      })
    }

    if (
      !mostRecentEdit ||
      new Date(article.edited) > new Date(mostRecentEdit)
    ) {
      mostRecentEdit = article.edited
    }
  }

  return {links, mostRecentEdit}
}

/**
 * Generate index page with links to articles
 */
async function generateIndexPage(
  sourcePath: string,
  destinationPath: string,
  language: SupportedLanguage,
  editTime: string,
  links: Links
): Promise<void> {
  await generateHtmlPage(
    generatePageAddress(language, ''),
    join(sourcePath, 'index.md'),
    join(destinationPath, 'index.html'),
    language,
    editTime,
    false,
    links
  )
}

/**
 * Process a node structure to generate HTML pages
 */
export async function processPages(
  sourcePath: string,
  destinationPath: string,
  rootFileNode: FileNode
): Promise<void> {
  try {
    await mkdir(destinationPath, {recursive: true})
    const language = getLanguageFromPath(destinationPath)

    // Separate articles and folders
    const folders = rootFileNode.children.filter(node => node.type === 'folder')
    const articles = rootFileNode.children.filter(
      node => node.type === 'article' && node.name !== 'index'
    )

    // Sort articles by creation time
    const sortedArticles = sortArticlesByCreationTime(articles)

    // Process folders first
    await processFolders(sourcePath, destinationPath, folders)

    // Process articles and get links
    const {links, mostRecentEdit} = await processArticles(
      sourcePath,
      destinationPath,
      sortedArticles,
      language
    )

    // Determine the final edit time for the index
    const indexEditTime =
      new Date(rootFileNode.edited) > new Date(mostRecentEdit)
        ? rootFileNode.edited
        : mostRecentEdit

    // Generate index page
    await generateIndexPage(
      sourcePath,
      destinationPath,
      language,
      indexEditTime,
      links
    )
  } catch (error) {
    console.error(`Error processing pages: ${error}`)
  }
}
