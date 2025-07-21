import {existsSync, statSync, rmdirSync} from 'node:fs'
import {readdir} from 'node:fs/promises'
import path from 'path'

/**
 * List of files to preserve during cleanup in the root directory
 */
const PRESERVED_FILES = [
  'cv-vladimir-lazarev-engineering-director.pdf',
  'mellon-for-incubators.pdf',
  'mellon-prototype.pdf',
  'og_image-min.jpg',
  'robots.txt',
  '.assetsignore'
]

/**
 * List of directories to preserve during cleanup
 */
const PRESERVED_DIRS = ['icons', 'fonts']

/**
 * Default public directory if not specified via environment
 */
const DEFAULT_PUBLIC_DIR = 'public'

/**
 * Recursively deletes directory contents, preserving specified files and directories
 * @param dirPath - Directory path to clean
 * @param isRootPublic - Whether this is the root public directory
 * @returns Promise resolving when deletion is complete
 */
async function deleteRecursively(dirPath: string, isRootPublic: boolean = false): Promise<void> {
  if (!existsSync(dirPath)) return
  
  const items = await readdir(dirPath)
  const publicDir = process.env.PUBLIC || DEFAULT_PUBLIC_DIR
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item)
    const isDirectory = statSync(itemPath).isDirectory()
    
    // Handle directories
    if (isDirectory) {
      // Skip preserved directories in root public
      if (isRootPublic && PRESERVED_DIRS.includes(item)) {
        console.log(`Keeping preserved directory: ${item}/`)
        continue
      }
      
      // Delete non-preserved directories
      await deleteRecursively(itemPath, false)
      try {
        rmdirSync(itemPath)
        console.log(`Deleted directory: ${itemPath}`)
      } catch (err) {
        console.error(`Failed to delete directory ${itemPath}: ${err}`)
      }
      continue
    }
    
    // Preserve specified files in root public directory
    if (isRootPublic && PRESERVED_FILES.includes(item)) {
      console.log(`Keeping preserved file: ${item}`)
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
 * Cleans up the public directory, preserving specified files and directories
 */
async function cleanupPublicDirectory(): Promise<void> {
  // Get public directory from environment or use default
  const publicDir = process.env.PUBLIC || DEFAULT_PUBLIC_DIR
  
  // Set default if not already set
  if (!process.env.PUBLIC) {
    process.env.PUBLIC = DEFAULT_PUBLIC_DIR
    console.log(`Using default PUBLIC: ${DEFAULT_PUBLIC_DIR}`)
  }
  
  // Validate public directory
  if (!existsSync(publicDir)) {
    console.error(`Directory does not exist: ${publicDir}`)
    process.exit(1)
  }
  
  console.log(`Starting cleanup of ${publicDir}`)
  console.log(`Preserving files: ${PRESERVED_FILES.join(', ')}`)
  console.log(`Preserving directories: ${PRESERVED_DIRS.join(', ')}`)
  
  // Perform cleanup
  await deleteRecursively(publicDir, true)
  
  console.log('Public directory cleanup completed')
}

// Execute cleanup
cleanupPublicDirectory().catch(err => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
