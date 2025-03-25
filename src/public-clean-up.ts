import {existsSync, statSync, rmdirSync} from 'node:fs'
import {readdir} from 'node:fs/promises'
import path from 'path'

import * as EnvUtils from './utils/envutils.ts'

/**
 * List of files to preserve during cleanup
 */
const PRESERVED_FILES = [
  'favicon.png',
  'mellon-for-incubators.pdf',
  'og_image-min.jpg',
  'robots.txt',
  'telegram.svg',
  'bluesky.svg',
  'minds.svg',
  'reddit.svg'
]

/**
 * Recursively deletes directory contents, preserving specified files
 * @param dirPath - Directory path to clean
 * @returns Promise resolving when deletion is complete
 */
async function deleteRecursively(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) return

  const items = await readdir(dirPath)
  const publicDir = process.env.PUBLIC

  for (const item of items) {
    const itemPath = path.join(dirPath, item)
    const isDirectory = statSync(itemPath).isDirectory()

    // Handle directories
    if (isDirectory) {
      await deleteRecursively(itemPath)
      try {
        rmdirSync(itemPath)
        console.log(`Deleted directory: ${itemPath}`)
      } catch (err) {
        console.error(`Failed to delete directory ${itemPath}: ${err}`)
      }
      continue
    }

    // Preserve excepted files in root public directory
    if (dirPath === publicDir && PRESERVED_FILES.includes(item)) {
      console.log(`Keeping excepted file: ${item}`)
      continue
    }

    // Delete other files
    try {
      const file = Bun.file(itemPath)
      await file.delete()
      console.log(`Deleted file: ${itemPath}`)
    } catch (err) {
      console.error(`Failed to delete file ${itemPath}: ${err}`)
    }
  }
}

/**
 * Cleans up the public directory, preserving specified files
 */
async function cleanupPublicDirectory(): Promise<void> {
  // Initialize environment variables
  EnvUtils.initDefaults()
  const publicDir = process.env.PUBLIC

  // Validate public directory
  if (!existsSync(publicDir)) {
    console.error(`Directory does not exist: ${publicDir}`)
    process.exit(1)
  }

  console.log(`Starting cleanup of ${publicDir}`)
  console.log(`Preserving the following files: ${PRESERVED_FILES.join(', ')}`)

  // Perform cleanup
  await deleteRecursively(publicDir)
  console.log('Public directory cleanup completed')
}

// Execute cleanup
cleanupPublicDirectory().catch(err => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
