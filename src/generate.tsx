import {join} from 'path'
import {rm} from 'node:fs/promises'

import type {Indexes, PageEntry, ArticleProcessingConfig} from './types'
import pullArticles from './pullArticles'
import {processArticles, processIndexes} from './processPages'

/**
 * Generate XML sitemap from page entries
 * @param publicPath Output directory for sitemap
 * @param pages Page entries to include in sitemap
 */
async function generateSitemap(
  publicPath: string,
  pages: PageEntry[]
): Promise<void> {
  const urls = pages.map(
    page => `<url>
  <loc>${page.path}</loc>
  <lastmod>${page.lastmod}</lastmod>
  <priority>${page.priority.toFixed(2)}</priority>
</url>\n`
  )

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
    http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

${urls}

</urlset>`

  await Bun.write(join(publicPath, 'sitemap.xml'), sitemapContent)
  console.log('Sitemap generated successfully.')
}

/**
 * Clean up articles directory after processing
 * @param articlesPath Path to articles directory
 */
async function cleanupArticlesDirectory(articlesPath: string): Promise<void> {
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
 * Configuration for site generation
 */
interface SiteGenerationConfig {
  articlesPath?: string
  publicPath?: string
  source?: string
}

/**
 * Generate static site with configurable options
 * @param config Site generation configuration
 */
async function generateSite(config: SiteGenerationConfig = {}): Promise<void> {
  const {
    articlesPath = process.env.ARTICLES,
    publicPath = process.env.PUBLIC,
    source = process.env.SOURCE
  } = config

  const indexes: Indexes = []
  const pages: PageEntry[] = []

  try {
    if (source !== 'local') {
      await pullArticles(articlesPath)
    }

    const processConfig: ArticleProcessingConfig = {
      articlesPath,
      publicPath,
      indexes,
      pages,
      depth: 1.0
    }

    await processArticles(processConfig)
    await processIndexes(publicPath, indexes)
    await generateSitemap(publicPath, pages)

    if (source !== 'local') {
      await cleanupArticlesDirectory(articlesPath)
    }

    console.log('Static site generation completed successfully.')
  } catch (error) {
    console.error(`Site generation error: ${error}`)
    throw error
  }
}

async function initializeSiteGeneration(): Promise<void> {
  try {
    const dotEnv = await Bun.file('.env')
    if (!(await dotEnv.exists())) {
      throw new Error('No .env file found')
    }

    await generateSite()
  } catch (error) {
    console.error('Site generation initialization error:', error)
    process.exit(1)
  }
}

initializeSiteGeneration()
