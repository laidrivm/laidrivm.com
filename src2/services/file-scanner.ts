import {mkdir} from 'node:fs/promises'
import {dirname, join, extname} from 'path'

import {ok, err} from '../utils.ts'
import type {
  ServiceResponse,
  FileInfo,
  FileCollection,
  FileType
} from '../types.ts'

/**
 * Determines if file is a supported content type
 * @param path - File path
 * @returns Content file type
 */
function getContentFileType(path: string): FileType {
  const extension = extname(path).toLowerCase()

  switch (extension) {
    case '.md':
    case '.markdown':
      return 'markdown'
    default:
      return 'unsupported'
  }
}

/**
 * Saves file content to local filesystem
 * @param content - File content
 * @param localPath - Local path to save to
 * @returns Success/failure result
 */
async function saveFileToLocal(
  content: string,
  localPath: string
): Promise<ServiceResponse<void>> {
  try {
    // Ensure directory exists
    const directory = dirname(localPath)
    await mkdir(directory, {recursive: true})

    // Write file
    await Bun.write(localPath, content)

    return ok(undefined)
  } catch (error) {
    return err(error)
  }
}

/**
 * Processes a single raw file
 * @param rawFile - Raw file from GitHub (FileInfo)
 * @returns Processed content file
 */
async function processFile(
  rawFile: FileInfo
): Promise<ServiceResponse<FileInfo>> {
  const localPath = join(process.env.ARTICLES_DIR, rawFile.sourcePath)

  if (rawFile.content.trim().length === 0) {
    return err(new Error('File is empty'))
  }

  const saveResult = await saveFileToLocal(rawFile.content, localPath)

  if (saveResult.success) {
    return ok({
      ...rawFile,
      localPath,
      type: getContentFileType(rawFile.sourcePath)
    })
  }

  return err(saveResult.error)
}

/**
 * Reads file content from GitHub and saves to local filesystem
 * @param githubContent - GitHub repository content response
 * @returns Collection of content files ready for processing
 */
export async function processFilesContent(
  githubContent: ServiceResponse<FileCollection>
): Promise<ServiceResponse<FileCollection>> {
  if (!githubContent.success) {
    return githubContent
  }

  const githubFiles = githubContent.data.files
  console.log(`Processing ${githubFiles.length} files from repository...`)

  const contentFiles: FileInfo[] = []

  for (const rawFile of githubFiles) {
    const processed = await processFile(rawFile)
    if (processed.success) {
      contentFiles.push(processed.data)
      console.log(
        `Saved: ${processed.data.sourcePath} -> ${processed.data.localPath}`
      )
    } else {
      console.error(`Failed to save file ${rawFile.path}:`, processed.error)
    }
  }
  if (contentFiles.length > 0) {
    return ok({
      files: contentFiles,
      lastFetch: githubContent.data.lastFetch,
      repoSha: githubContent.data.repoSha
    })
  }
  return err(new Error(`No files to process`))
}
