import {join} from 'path'

import * as EnvUtils from './utils/envutils.ts'
import * as FileUtils from './utils/fileutils.ts'
import * as PathUtils from './utils/pathutils.ts'
import * as SourceProcessor from './processsources.ts'
import {processPages} from './processpages.tsx'
import type {FileNode} from './types.ts'

/**
 * Generate XML sitemap from page entries
 * @param publicPath - Output directory for sitemap
 * @param nodes - Page entries to include in sitemap
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
 * Recursively generates sitemap URLs from file nodes
 * @param nodes - File node structure
 * @param priority - Priority value for current level
 * @param relativePath - Current relative path
 * @returns Sitemap URL entries as string
 */
function getSiteMapURLs(
  nodes: FileNode,
  priority: number,
  relativePath: string
): string {
  if (!nodes.children) return ''

  const baseUrl = EnvUtils.getBaseUrl()
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
        const lang = PathUtils.getLanguageFromPath(relativePath)
        const address = PathUtils.generatePageAddress(lang, node.name, baseUrl)
        const nodePriority = node.name === 'index' ? priority : priority - 0.2

        result += `<url>
  <loc>${address}</loc>
  <lastmod>${node.edited.replace(/\.\d{3}Z$/, '+00:00')}</lastmod>
  <priority>${nodePriority.toFixed(2)}</priority>
</url>\n`
        break
      }
    }
  }
  return result
}

/**
 * Generate static site with configurable options
 */
async function generateSite(): Promise<void> {
  const config = EnvUtils.getConfig()
  const articlesPath = config.ARTICLES
  const publicPath = config.PUBLIC
  const source = config.SOURCE

  try {
    // Process content source (local or remote)
    const nodes = await SourceProcessor.processSource()

    // Generate HTML pages
    await processPages(articlesPath, publicPath, nodes)

    // Copy images from content to public directory
    await FileUtils.copyImagesRecursively(articlesPath, publicPath)

    // Generate sitemap for SEO
    await generateSitemap(publicPath, nodes)

    // Clean up temporary files if using remote source
    if (source !== 'local') {
      await SourceProcessor.cleanupArticlesDirectory()
    }

    console.log('Static site generation completed successfully.')
  } catch (error) {
    console.error(`Site generation error: ${error}`)
    throw error
  }
}

// Initialize environment and generate site
EnvUtils.initDefaults()
await generateSite()
