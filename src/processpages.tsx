import {join, basename, dirname} from 'path'
import {readdir, stat, mkdir} from 'node:fs/promises'
import {renderToString} from 'preact-render-to-string'
import xss from 'xss'

import customWhiteList from './xssconfig.ts'
import Page from './components/page.tsx'
import ArticleList from './components/articlelist.tsx'

import * as MarkdownUtils from './markdown.tsx'
import * as PathUtils from './pathutils.ts'

import type {
  SupportedLanguage,
  Index,
  Indexes,
  PageEntry,
  ArticleProcessingConfig
} from './types'

const XSS_OPTIONS = {
  whiteList: customWhiteList
}

function formatDateForSitemap(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '+00:00')
}

/**
 * Generates an HTML page from a markdown file
 */
async function generateHtmlPage({
  address,
  mdPath,
  outputPath,
  language,
  links = [],
  includeArrow = false
}: {
  address: string
  mdPath: string
  outputPath: string
  language: SupportedLanguage
  links?: {title: string; url: string}[]
  includeArrow?: boolean
}): Promise<string | null> {
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
        image={image}
        content={`${contentHtml}${linksHtml}`}
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
 * Processes a single article file
 */
async function processArticleFile(
  options: ArticleProcessingConfig & {
    filePath: string
    fileStat: import('fs').Stats
  }
) {
  const {articlesPath, publicPath, indexes, pages, depth, filePath, fileStat} =
    options

  const articlesLanguage = PathUtils.getLanguageFromPath(articlesPath)
  const thisIndex = indexes.find(idx => idx.path === articlesPath)

  if (!thisIndex) {
    console.warn(`No index found for path: ${articlesPath}`)
    return
  }

  const {outputDir, outputFileName, isIndexMd} = PathUtils.resolveOutputPaths(
    articlesPath,
    publicPath,
    basename(filePath)
  )

  await mkdir(outputDir, {recursive: true})

  const pageAddress = PathUtils.generatePageAddress(
    articlesLanguage,
    basename(outputDir)
  )

  if (isIndexMd) {
    try {
      await generateHtmlPage({
        address: pageAddress,
        mdPath: filePath,
        outputPath: join(outputDir, outputFileName),
        language: thisIndex.language
      })
      pages.push({
        path: PathUtils.generatePageAddress(articlesLanguage, ''),
        lastmod: formatDateForSitemap(fileStat.mtime),
        priority: Math.max(0.5, depth)
      })
    } catch (error) {
      console.warn(`Skipping index generation for ${filePath}`)
    }
  } else {
    try {
      const text = await generateHtmlPage({
        address: pageAddress,
        mdPath: filePath,
        outputPath: join(outputDir, outputFileName),
        language: thisIndex.language,
        includeArrow: true
      })

      if (text) {
        pages.push({
          path: pageAddress,
          lastmod: formatDateForSitemap(fileStat.mtime),
          priority: Math.max(0.5, depth - 0.2)
        })

        thisIndex.links.push({
          text,
          address: `${basename(outputDir)}`
        })
      }
    } catch (error) {
      console.error(`Error processing article ${filePath}:`, error)
    }
  }
}

/**
 * Copies non-markdown files to the public directory
 */
async function copyNonMarkdownFile(sourcePath: string, destPath: string) {
  await mkdir(dirname(destPath), {recursive: true})
  const sourceFile = Bun.file(sourcePath)
  const destFile = Bun.file(destPath)
  await Bun.write(destFile, sourceFile)
}

/**
 * Recursively processes articles in a directory
 */
export async function processArticles(options: ArticleProcessingConfig) {
  const {articlesPath, publicPath, indexes, pages, depth} = options

  const articlesLanguage = PathUtils.getLanguageFromPath(articlesPath)

  await mkdir(publicPath, {recursive: true})

  indexes.push({
    path: articlesPath,
    links: [],
    language: articlesLanguage
  })

  const files = await readdir(articlesPath)

  for (const file of files) {
    const filePath = join(articlesPath, file)
    const fileStat = await stat(filePath)

    if (fileStat.isDirectory()) {
      await processArticles({
        ...options,
        articlesPath: filePath,
        publicPath: join(publicPath, file),
        depth: depth - 0.1
      })
    } else if (file.endsWith('.md')) {
      await processArticleFile({
        ...options,
        filePath,
        fileStat
      })
    } else if (!file.endsWith('.md')) {
      const destPath = join(publicPath, file)
      await copyNonMarkdownFile(filePath, destPath)
    }
  }
}

/**
 * Process index pages for different languages
 */
export async function processIndexes(publicPath: string, indexes: Indexes) {
  try {
    for (const index of indexes) {
      const mdPath = `${index.path}/index.md`
      const outputPath =
        index.language === 'en'
          ? `${publicPath}/index.html`
          : `${publicPath}/${index.language}/index.html`

      const indexAddress =
        index.language === 'en'
          ? `https://${process.env.ADDRESS}/`
          : `https://${process.env.ADDRESS}/${index.language}/`

      if (
        await generateHtmlPage({
          address: indexAddress,
          mdPath,
          outputPath,
          language: index.language,
          links: index.links
        })
      ) {
        console.log(`${index.language} index page generated successfully.`)
      }
    }
  } catch (error) {
    console.error(`Error generating indexes: ${error}`)
  }
}

export default {
  processArticles,
  processIndexes
}
