import {asyncPipe} from '../utils.ts'
import type {ServiceResponse} from '../types.ts'

import {fetchGitHubContent} from './github-fetcher.ts'

/**
 * Triggers the complete site generation process
 * @returns Build result
 */
export async function generate(): Promise<ServiceResponse> {
  const startTime = Date.now()
  try {
    console.log('Starting site generation...')
    const data = await asyncPipe(
      fetchGitHubContent
      // readFileContent,
      // parseMarkdown,
      // extractMetadata,
      // renderFromTemplate,
      // optimizeOutput,
      // processAssets,
      // uploadToCloudflare
    )(undefined)
    const buildTime = Date.now() - startTime
    console.log(`Site generation completed in ${buildTime}ms`)
    return {
      success: true,
      data
    }
  } catch (error) {
    return {
      success: false,
      error
    }
  }
}
