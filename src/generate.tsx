import {join, extname, dirname} from 'path'
import {rm, mkdir, readdir, stat} from 'node:fs/promises'

import * as EnvUtils from './envutils.ts'
import {processLocalSource, processRemoteSource} from './processsources.ts'
import {processPages} from './processpages.tsx'
import type {SupportedLanguage, FileNode} from './types.ts'

/**
 * Determines the language of a given path
 */
function getLanguageFromPath(path: string): SupportedLanguage {
  if (!path || typeof path !== 'string') {
    console.warn(`Invalid path provided: ${path}`)
    return 'en'
  }

  const validLanguages: SupportedLanguage[] = ['en', 'ru', 'es', 'fr']
  const language = path.replace(/\/+$/, '').split('/').filter(Boolean)[0]

  return validLanguages.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : 'en'
}

function generatePageAddress(
  language: SupportedLanguage,
  baseFileName: string
): string {
  const baseUrl = `https://${process.env.ADDRESS}`
  baseFileName = baseFileName === 'index' ? '' : baseFileName
  return language === 'en'
    ? `${baseUrl}/${baseFileName}`
    : `${baseUrl}/${language}/${baseFileName}`
}

function getSiteMapURLs(
  nodes: FileNode,
  priority: number,
  relativePath: string
): string {
  let result = ''
  for (const node of nodes.children) {
    switch (node.type) {
      case 'folder': {
        result += getSiteMapURLs(
          node,
          priority - 0.1,
          join(relativePath, node.name)
        )
        break
      }
      case 'article': {
        result += `<url>
  <loc>${generatePageAddress(getLanguageFromPath(relativePath), node.name)}</loc>
  <lastmod>${node.edited.replace(/\.\d{3}Z$/, '+00:00')}</lastmod>
  <priority>${node.name === 'index' ? priority.toFixed(2) : (priority - 0.2).toFixed(2)}</priority>
</url>\n`
        break
      }
      default: {
        console.log(`Unknown type for ${node.name}`)
      }
    }
  }
  return result
}

/**
 * Generate XML sitemap from page entries
 * @param publicPath Output directory for sitemap
 * @param pages Page entries to include in sitemap
 */
async function generateSitemap(
  publicPath: string,
  nodes: FileNode
): Promise<void> {
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
    http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

${getSiteMapURLs(nodes, 1.0, '/')}

</urlset>`
  await Bun.write(join(publicPath, 'sitemap.xml'), sitemapContent)
  console.log('Sitemap generated successfully.')
}

/**
 * Check if a file is an image based on its extension
 * @param filename Filename to check
 * @returns Boolean indicating if file is an image
 */
function isImage(filename: string): boolean {
  const IMAGE_EXTENSIONS: string[] = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp'
  ]
  const ext = extname(filename).toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

/**
 * Copies non-markdown files to the public directory
 * @param articlesPath Path to articles directory
 */
async function copyFile(sourcePath: string, destPath: string) {
  await mkdir(dirname(destPath), {recursive: true})
  const sourceFile = Bun.file(sourcePath)
  const destFile = Bun.file(destPath)
  await Bun.write(destFile, sourceFile)
}

/**
 * Recursively traverses a directory and copies all image files to destination
 * preserving the folder structure
 * @param sourceDir Source directory path
 * @param destDir Destination directory path
 * @param relativePath Current relative path (used in recursion)
 */
async function copyImagesRecursively(
  sourceDir: string,
  destDir: string,
  relativePath = ''
) {
  const currentDir = join(sourceDir, relativePath)

  try {
    // Read all entries in the current directory using fs.promises.readdir
    const entries = await readdir(currentDir)

    // Process each entry
    for (const entry of entries) {
      const entryPath = join(relativePath, entry)
      const fullSourcePath = join(sourceDir, entryPath)
      const fullDestPath = join(destDir, entryPath)

      // Check if entry is directory or file
      const stats = await stat(fullSourcePath)

      if (stats.isDirectory()) {
        // Recursively process subdirectories
        await copyImagesRecursively(sourceDir, destDir, entryPath)
      } else if (isImage(entry)) {
        // Copy image files
        console.log(`Copying image: ${entryPath}`)
        await copyFile(fullSourcePath, fullDestPath)
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${currentDir}:`, error)
  }
}

/**
 * Clean up articles directory after processing
 */
async function cleanupArticlesDirectory(): Promise<void> {
  const articlesPath = process.env.ARTICLES
  try {
    await rm(articlesPath, {recursive: true})
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`${articlesPath} directory doesn't exist`)
    } else {
      throw error
    }
  }
}

/**
 * Generate static site with configurable options
 */
async function generateSite(): void {
  const articlesPath = process.env.ARTICLES
  const publicPath = process.env.PUBLIC
  const source = process.env.SOURCE

  try {
    const nodes =
      source === 'local'
        ? await processLocalSource(articlesPath)
        : await processRemoteSource()

    await processPages(articlesPath, publicPath, nodes)
    await copyImagesRecursively(articlesPath, publicPath)
    await generateSitemap(publicPath, nodes)

    if (source !== 'local') {
      await cleanupArticlesDirectory()
    }

    console.log('Static site generation completed successfully.')
  } catch (error) {
    console.error(`Site generation error: ${error}`)
    throw error
  }
}

EnvUtils.initDefaults()
await generateSite()
