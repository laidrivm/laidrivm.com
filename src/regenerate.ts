import * as EnvUtils from './utils/envutils.ts'
import * as FileUtils from './utils/fileutils.ts'
import * as SourceProcessor from './processsources.ts'
import {processPages} from './processpages.tsx'

/**
 * Flag to track if regeneration is in progress
 */
let isRegenerating = false

/**
 * Regenerate content from remote repository, updating only changed articles
 * @returns Promise resolving to regeneration success status
 */
export async function regenerate(): Promise<boolean> {
  // Prevent concurrent regenerations
  if (isRegenerating) {
    console.log('Regeneration already in progress, skipping request')
    return false
  }

  try {
    isRegenerating = true
    console.log('Starting selective content regeneration...')

    const config = EnvUtils.getConfig()

    // Validate source is remote
    if (config.SOURCE === 'local') {
      console.log('Regeneration not supported for local source')
      return false
    }

    // Process content source (remote)
    const nodes = await SourceProcessor.processSource()

    // Generate HTML pages
    await processPages(config.ARTICLES, config.PUBLIC, nodes)

    // Copy images from content to public directory
    await FileUtils.copyImagesRecursively(config.ARTICLES, config.PUBLIC)

    // Clean up temporary files
    await SourceProcessor.cleanupArticlesDirectory()

    console.log('Selective content regeneration completed successfully')
    return true
  } catch (error) {
    console.error('Error during content regeneration:', error)
    return false
  } finally {
    isRegenerating = false
  }
}
