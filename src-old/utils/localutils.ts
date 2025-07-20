import {readdir, stat} from 'node:fs/promises'

import {safePath, getBaseName} from './pathutils.ts'
import type {FileNode} from './types'

/**
 * Check if a directory node contains any articles (directly or nested)
 * @param node - Directory node to check
 * @returns Whether node contains articles
 */
export function hasArticles(node: FileNode): boolean {
  if (node.type === 'article') {
    return true
  }

  if (node.children && node.children.length > 0) {
    return node.children.some(child => hasArticles(child))
  }

  return false
}

/**
 * Process a local directory to build a content tree
 * @param directoryPath - Directory path
 * @returns Directory structure
 */
export async function processLocalSource(
  directoryPath: string
): Promise<FileNode> {
  try {
    const dirStat = await stat(directoryPath)
    const edited = dirStat.mtime.toISOString()
    const created = dirStat.birthtime.toISOString()

    const children: FileNode[] = []
    const entries = await readdir(directoryPath, {withFileTypes: true})

    for (const entry of entries) {
      const entryPath = safePath(directoryPath, entry.name)

      if (entry.isDirectory()) {
        const subDir = await processLocalSource(entryPath)

        if (
          subDir.type === 'folder' &&
          subDir.children &&
          hasArticles(subDir)
        ) {
          children.push(subDir)
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const fileStat = await stat(entryPath)
        const fileEdited = fileStat.mtime.toISOString()
        const fileCreated = fileStat.birthtime.toISOString()

        const articleName = entry.name.replace(/\.md$/, '')

        children.push({
          name: articleName,
          type: 'article',
          edited: fileEdited,
          created: fileCreated
        })
      }
    }

    return {
      name: getBaseName(directoryPath),
      type: 'folder',
      edited,
      created,
      children
    }
  } catch (error) {
    console.error(`Error processing local directory ${directoryPath}:`, error)
    throw error
  }
}
