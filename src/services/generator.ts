import {asyncPipe, ok} from '../utils.ts'
import type {ServiceResponse, GenerateType} from '../types.ts'

import {loadMetaVersion, createMetaFile} from './metafile.ts'
import {fetchGitHubContent} from './github-fetcher.ts'
import {processFilesContent} from './file-scanner.ts'
import {parseMarkdown} from './markdown-parser.ts'
import {renderMarkdown} from './markdown-renderer.tsx'
import {renderPages} from './template-renderer.tsx'
import {processAssets} from './assets-manager.ts'

/**
 * Triggers the complete site generation process
 * @returns Build result
 */
export async function generate(
  mode: GenerateType
): Promise<ServiceResponse<Date>> {
  const startTime = Date.now()
  console.log(`Starting site generation in the ${mode} mode`)

  const metaVersion = await loadMetaVersion()
  const currentVersion = process.env['VERSION']

  if (mode === 'initial' && currentVersion && metaVersion) {
    if (currentVersion > metaVersion) {
      mode = 'all'
    } else {
      mode = 'new'
    }
  }

  const pipelineResult = await asyncPipe(
    fetchGitHubContent,
    processFilesContent,
    parseMarkdown,
    renderMarkdown,
    renderPages,
    // optimizeOutput
    processAssets
    // uploadToCloudflare
  )(mode)

  const buildTime = Date.now() - startTime

  console.log(pipelineResult)

  if (pipelineResult.success) {
    console.log(`Site generation completed in ${buildTime}ms`)
    const dateResult = await createMetaFile()
    if (dateResult.success && dateResult.data) {
      return ok(dateResult.data)
    }
    return dateResult
  }

  console.log(`Site generation failed after ${buildTime}ms`)
  return pipelineResult as ServiceResponse<Date>
}
