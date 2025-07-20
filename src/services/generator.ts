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
  if (mode === 'initial') {
    if (process.env['VERSION'] > metaVersion) {
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
    const date = await createMetaFile()
    return ok(date)
  }

  console.log(`Site generation failed after ${buildTime}ms`)
  return pipelineResult
}
