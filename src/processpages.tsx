import {join} from 'path'

import {renderToString} from 'preact-render-to-string'
import xss from 'xss'

import customWhiteList from './xssconfig.ts'
import Page from './components/page.tsx'
import ArticleList from './components/articlelist.tsx'
import * as MarkdownUtils from './markdown.tsx'
import * as PathUtils from './utils/pathutils.ts'
import * as FileUtils from './utils/fileutils.ts'
import * as EnvUtils from './utils/envutils.ts'
import type {SupportedLanguage, FileNode, Links} from './types.ts'

const XSS_OPTIONS = {
  whiteList: customWhiteList
}

/**
 * Generates an HTML page from a markdown file
 * @param address - Canonical page address
 * @param mdPath - Path to markdown file
 * @param outputPath - Path to output HTML file
 * @param language - Page language
 * @param time - Last modified time
 * @param includeArrow - Whether to include navigation arrow
 * @param links - Optional links to include
 * @returns Title of the generated page or null if failed
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
    await FileUtils.createDir(join(outputPath, '..'))
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
 * @param articles - Array of article nodes
 * @returns Sorted array of article nodes
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
 * @param sourcePath - Source directory path
 * @param destinationPath - Destination directory path
 * @param folders - Array of folder nodes
 */
async function processFolders(
  sourcePath: string,
  destinationPath: string,
  folders: FileNode[]
): Promise<void> {
  const processPromises = folders.map(folder =>
    processPages(
      join(sourcePath, folder.name),
      join(destinationPath, folder.name),
      folder
    )
  )

  await Promise.all(processPromises)
}

/**
 * Process articles and build links
 * @param sourcePath - Source directory path
 * @param destinationPath - Destination directory path
 * @param articles - Array of article nodes
 * @param language - Language code
 * @returns Object containing links and most recent edit time
 */
async function processArticles(
  sourcePath: string,
  destinationPath: string,
  articles: FileNode[],
  language: SupportedLanguage
): Promise<{links: Links; mostRecentEdit: string}> {
  let mostRecentEdit = ''
  const links: Links = []
  const baseUrl = EnvUtils.getBaseUrl()

  const processPromises = articles.map(async article => {
    const address = PathUtils.generatePageAddress(
      language,
      article.name,
      baseUrl
    )
    const outputPath = join(destinationPath, article.name, 'index.html')

    await FileUtils.createDir(join(destinationPath, article.name))

    const title = await generateHtmlPage(
      address,
      join(sourcePath, article.name + '.md'),
      outputPath,
      language,
      article.edited,
      true
    )

    if (title) {
      return {
        link: {text: title, address},
        editTime: article.edited
      }
    }

    return null
  })

  const results = await Promise.all(processPromises)

  // Filter out null results and process valid ones
  results.filter(Boolean).forEach(result => {
    if (result) {
      links.push(result.link)

      if (
        !mostRecentEdit ||
        new Date(result.editTime) > new Date(mostRecentEdit)
      ) {
        mostRecentEdit = result.editTime
      }
    }
  })

  return {links, mostRecentEdit}
}

/**
 * Generate index page with links to articles
 * @param sourcePath - Source directory path
 * @param destinationPath - Destination directory path
 * @param language - Language code
 * @param editTime - Edit time for the index page
 * @param links - Links to include in the index page
 */
async function generateIndexPage(
  sourcePath: string,
  destinationPath: string,
  language: SupportedLanguage,
  editTime: string,
  links: Links
): Promise<void> {
  const baseUrl = EnvUtils.getBaseUrl()
  await generateHtmlPage(
    PathUtils.generatePageAddress(language, '', baseUrl),
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
 * @param sourcePath - Source directory path
 * @param destinationPath - Destination directory path
 * @param rootFileNode - Root file node
 */
export async function processPages(
  sourcePath: string,
  destinationPath: string,
  rootFileNode: FileNode
): Promise<void> {
  try {
    await FileUtils.createDir(destinationPath)
    const language = PathUtils.getLanguageFromPath(destinationPath)

    // Separate articles and folders
    const folders =
      rootFileNode.children?.filter(node => node.type === 'folder') || []
    const articles =
      rootFileNode.children?.filter(
        node => node.type === 'article' && node.name !== 'index'
      ) || []

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
