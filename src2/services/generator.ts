import {asyncPipe, ok} from '../utils.ts'
import type {ServiceResponse} from '../types.ts'

import {fetchGitHubContent} from './github-fetcher.ts'
import {processFilesContent} from './file-scanner.ts'

/**
 * Triggers the complete site generation process
 * @returns Build result
 */
export async function generate(): Promise<ServiceResponse> {
  const startTime = Date.now()
  console.log('Starting site generation...')

  const pipelineResult = await asyncPipe(
    fetchGitHubContent,
    processFilesContent
    // parseMarkdown,
    // extractMetadata,
    // renderFromTemplate,
    // optimizeOutput,
    // processAssets,
    // uploadToCloudflare
  )(undefined)

  const buildTime = Date.now() - startTime

  if (pipelineResult.success) {
    console.log(`Site generation completed in ${buildTime}ms`)
    return ok(pipelineResult.data)
  }

  console.log(`Site generation failed after ${buildTime}ms`)
  return pipelineResult
}
