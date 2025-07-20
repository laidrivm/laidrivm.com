import {join, dirname} from 'path'
import {mkdir, copyFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'

import {ok, err} from '../utils.ts'
import type {ServiceResponse, FileCollection, FileInfo} from '../types.ts'

/**
 * Checks if a file is an asset that needs to be copied
 */
function isAssetFile(file: FileInfo): boolean {
  return file.type === 'unsupported'
}

/**
 * Gets the output path for an asset file in the public directory
 */
function getAssetOutputPath(sourcePath: string): string {
  const publicDir = process.env.PUBLIC_DIR || 'public'
  return join(publicDir, sourcePath)
}

/**
 * Copies a single asset file to the public directory
 */
async function copyAssetFile(
  file: FileInfo
): Promise<ServiceResponse<FileInfo>> {
  try {
    const outputPath = getAssetOutputPath(file.sourcePath)
    const outputDir = dirname(outputPath)

    // Create directory if it doesn't exist
    await mkdir(outputDir, {recursive: true})

    // Copy the file
    if (file.localPath && existsSync(file.localPath)) {
      await copyFile(file.localPath, outputPath)
      console.log(`Copied asset: ${file.sourcePath} → ${outputPath}`)

      return ok({
        ...file,
        outputPath
      })
    } else {
      // If no local path or file doesn't exist, write content directly
      if (file.content && typeof file.content === 'string') {
        await Bun.write(outputPath, file.content)
        console.log(`Written asset: ${file.sourcePath} → ${outputPath}`)

        return ok({
          ...file,
          outputPath
        })
      } else {
        return err(
          new Error(`No source available for asset: ${file.sourcePath}`)
        )
      }
    }
  } catch (error) {
    console.error(`Failed to copy asset ${file.sourcePath}:`, error)
    return err(error as Error)
  }
}

/**
 * Filters asset files from the file collection
 */
function getAssetFiles(files: FileInfo[]): FileInfo[] {
  return files.filter(isAssetFile)
}

/**
 * Copies all asset files in parallel with concurrency limit
 */
async function copyAllAssets(
  assetFiles: FileInfo[],
  concurrencyLimit = 5
): Promise<ServiceResponse<FileInfo[]>> {
  const results: FileInfo[] = []
  const errors: Error[] = []

  // Process in batches to avoid too many concurrent file operations
  for (let i = 0; i < assetFiles.length; i += concurrencyLimit) {
    const batch = assetFiles.slice(i, i + concurrencyLimit)
    const batchResults = await Promise.all(
      batch.map(file => copyAssetFile(file))
    )

    batchResults.forEach(result => {
      if (result.success && result.data) {
        results.push(result.data)
      } else if (result.error) {
        errors.push(result.error)
      }
    })
  }

  if (errors.length > 0) {
    console.error(`Failed to copy ${errors.length} assets`)
    return err(new Error(`Failed to copy ${errors.length} assets`))
  }

  return ok(results)
}

/**
 * Merges copied assets back into the file collection
 */
function mergeProcessedFiles(
  originalFiles: FileInfo[],
  processedAssets: FileInfo[]
): FileInfo[] {
  // Create a map of processed assets for quick lookup
  const processedMap = new Map<string, FileInfo>()
  processedAssets.forEach(asset => {
    processedMap.set(asset.sourcePath, asset)
  })

  // Replace original assets with processed ones
  return originalFiles.map(file => {
    if (isAssetFile(file) && processedMap.has(file.sourcePath)) {
      return processedMap.get(file.sourcePath)!
    }
    return file
  })
}

/**
 * Logs asset processing summary
 */
function logAssetSummary(
  assetFiles: FileInfo[],
  processedAssets: FileInfo[]
): void {
  console.log(`Asset processing summary:`)
  console.log(`- Total assets found: ${assetFiles.length}`)
  console.log(`- Successfully copied: ${processedAssets.length}`)

  if (assetFiles.length > processedAssets.length) {
    console.log(
      `- Failed to copy: ${assetFiles.length - processedAssets.length}`
    )
  }
}

/**
 * Main function that processes and copies all asset files to the public directory
 */
export async function processAssets(
  renderedContent: ServiceResponse<FileCollection>
): Promise<ServiceResponse<FileCollection>> {
  // Early return if input is not successful
  if (!renderedContent.success) {
    return renderedContent
  }

  // Skip if mode is 'skip'
  if (renderedContent.data.mode === 'skip') {
    console.log('Skipping asset processing')
    return ok({mode: 'skip'})
  }

  const {files} = renderedContent.data

  // Get all asset files
  const assetFiles = getAssetFiles(files)

  if (assetFiles.length === 0) {
    console.log('No assets to process')
    return renderedContent
  }

  console.log(`Processing ${assetFiles.length} asset files...`)

  // Copy all assets
  const copyResult = await copyAllAssets(assetFiles)

  if (!copyResult.success) {
    return copyResult
  }

  const processedAssets = copyResult.data

  // Log summary
  logAssetSummary(assetFiles, processedAssets)

  // Merge processed assets back into the file collection
  const updatedFiles = mergeProcessedFiles(files, processedAssets)

  return ok({
    ...renderedContent.data,
    files: updatedFiles
  })
}
