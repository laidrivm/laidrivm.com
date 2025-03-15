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
function getLanguageFromPath(path: string): SupportedLanguage {
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
function generatePageAddress(
  language: SupportedLanguage,
  baseFileName: string
): string {
  const baseUrl = `https://${process.env.ADDRESS}`
  return language === 'en'
    ? `${baseUrl}/${baseFileName}`
    : `${baseUrl}/${language}/${baseFileName}`
}

export function isLanguageDirectory(path: string): boolean {
  const validLanguages: SupportedLanguage[] = ['en', 'ru', 'es', 'fr']
  const parts = path.replace(/\/+$/, '').split('/').filter(Boolean)

  const candidate = parts[parts.length - 1]
  return validLanguages.includes(candidate as SupportedLanguage)
}

/**
 * Generates an HTML page from a markdown file
 */
async function generateHtmlPage(
  address: string,
  mdPath: string,
  outputPath: string,
  language: SupportedLanguage,
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

export async function processPages(
  sourcePath: string,
  destinationPath: string,
  rootFileNode: FileNode
): Promise<void> {
  try {
    await mkdir(destinationPath, {recursive: true})
    const language = getLanguageFromPath(destinationPath)
    const links: Links = []

    for (const node of rootFileNode.children) {
      switch (node.type) {
        case 'folder': {
          await processPages(
            join(sourcePath, node.name),
            join(destinationPath, node.name),
            node
          )
          break
        }
        case 'article': {
          if (node.name === 'index') continue
          const address = generatePageAddress(language, node.name)
          const title = await generateHtmlPage(
            address,
            join(sourcePath, node.name + '.md'),
            join(destinationPath, node.name, 'index.html'),
            language,
            true
          )
          if (title) {
            links.push({
              text: title,
              address
            })
          }
          break
        }
        default: {
          console.log(`Unknown type for ${node.name}`)
        }
      }
    }

    await generateHtmlPage(
      generatePageAddress(language, ''),
      join(sourcePath, 'index.md'),
      join(destinationPath, 'index.html'),
      language,
      false,
      links
    )
  } catch (error) {
    console.error(`Error processing pages: ${error}`)
  }
}
