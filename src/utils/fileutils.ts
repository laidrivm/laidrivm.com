import {mkdir, rm, readdir, stat} from 'node:fs/promises'
import {existsSync} from 'node:fs'

import {isImage, safePath, getDir} from './pathutils.ts'

/**
 * Create a directory recursively
 * @param dirPath - Directory path
 * @returns Promise resolving when directory is created
 */
export async function createDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, {recursive: true})
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error)
    throw error
  }
}

/**
 * Remove a directory recursively
 * @param dirPath - Directory path
 * @returns Promise resolving when directory is removed
 */
export async function removeDir(dirPath: string): Promise<void> {
  try {
    await rm(dirPath, {recursive: true})
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`Directory doesn't exist: ${dirPath}`)
    } else {
      throw error
    }
  }
}

/**
 * Copy a file
 * @param sourcePath - Source file path
 * @param destPath - Destination file path
 * @returns Promise resolving when file is copied
 */
export async function copyFile(
  sourcePath: string,
  destPath: string
): Promise<void> {
  try {
    await createDir(getDir(destPath))
    const sourceFile = Bun.file(sourcePath)
    const destFile = Bun.file(destPath)
    await Bun.write(destFile, sourceFile)
  } catch (error) {
    console.error(
      `Failed to copy file from ${sourcePath} to ${destPath}:`,
      error
    )
    throw error
  }
}

/**
 * Copy images recursively from source to destination
 * @param sourceDir - Source directory
 * @param destDir - Destination directory
 * @param relativePath - Current relative path
 * @returns Promise resolving when all images are copied
 */
export async function copyImagesRecursively(
  sourceDir: string,
  destDir: string,
  relativePath = ''
): Promise<void> {
  const currentDir = safePath(sourceDir, relativePath)

  try {
    const entries = await readdir(currentDir)

    for (const entry of entries) {
      const entryPath = safePath(relativePath, entry)
      const fullSourcePath = safePath(sourceDir, entryPath)
      const fullDestPath = safePath(destDir, entryPath)

      const stats = await stat(fullSourcePath)

      if (stats.isDirectory()) {
        await copyImagesRecursively(sourceDir, destDir, entryPath)
      } else if (isImage(entry)) {
        console.log(`Copying image: ${entryPath}`)
        await copyFile(fullSourcePath, fullDestPath)
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${currentDir}:`, error)
    throw error
  }
}

/**
 * Check if a file exists
 * @param filePath - File path
 * @returns Whether the file exists
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath)
}

/**
 * Read a file as text
 * @param filePath - File path
 * @returns File contents as string
 */
export async function readTextFile(filePath: string): Promise<string> {
  try {
    const file = Bun.file(filePath)
    if (!(await file.exists())) {
      throw new Error(`File not found: ${filePath}`)
    }
    return await file.text()
  } catch (error) {
    console.error(`Failed to read file ${filePath}:`, error)
    throw error
  }
}

/**
 * Write text to a file
 * @param filePath - File path
 * @param content - File content
 * @returns Promise resolving when file is written
 */
export async function writeTextFile(
  filePath: string,
  content: string
): Promise<void> {
  try {
    await createDir(getDir(filePath))
    await Bun.write(filePath, content)
  } catch (error) {
    console.error(`Failed to write file ${filePath}:`, error)
    throw error
  }
}
