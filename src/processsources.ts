import {getConfig} from './utils/envutils.ts'
import {processLocalSource} from './utils/localutils.ts'
import {pullFromGitHub} from './utils/githubutils.ts'
import {removeDir} from './utils/fileutils.ts'
import type {FileNode} from './types.ts'

/**
 * Process content sources based on configuration
 * @returns Content tree structure
 */
export async function processSource(): Promise<FileNode> {
  const config = getConfig()
  const articlesPath = config.ARTICLES
  const source = config.SOURCE

  try {
    if (source === 'local') {
      console.log('Processing local content source...')
      return await processLocalSource(articlesPath)
    } else {
      console.log(`Processing remote content from ${source}...`)
      return await pullFromGitHub(source, config.GITHUB_TOKEN, articlesPath)
    }
  } catch (error) {
    console.error(`Error processing source: ${error}`)
    throw error
  }
}

/**
 * Clean up articles directory
 * @returns Promise that resolves when cleanup is complete
 */
export async function cleanupArticlesDirectory(): Promise<void> {
  const config = getConfig()

  if (config.SOURCE === 'local') {
    console.log('Skipping cleanup for local source')
    return
  }

  try {
    await removeDir(config.ARTICLES)
  } catch (error) {
    console.error(`Error cleaning up articles directory: ${error}`)
  }
}
