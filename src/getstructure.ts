import fs from 'node:fs/promises'
import {join, basename} from 'path'

import type {FileNode, FileNodeType} from './types.ts'

/**
 * Check if a directory node contains any articles (directly or nested)
 * @param node Directory node to check
 * @returns True if directory contains articles
 */
function hasArticles(node: FileNode): boolean {
  if (node.type === 'article') {
    return true
  }

  if (node.children && node.children.length > 0) {
    return node.children.some(child => hasArticles(child))
  }

  return false
}

/**
 * Get directory structure from local filesystem
 * @param directoryPath Path to the local directory
 * @returns Directory structure
 */
export async function getDirectoryStructure(
  directoryPath: string
): Promise<FileNode> {
  const dirName = basename(directoryPath)
  const dirStat = await fs.stat(directoryPath)
  const edited = dirStat.mtime.toISOString()

  const children: FileNode[] = []
  const entries = await fs.readdir(directoryPath, {withFileTypes: true})

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name)

    if (entry.isDirectory()) {
      const subDir = await getDirectoryStructure(entryPath)

      if (subDir.type === 'folder' && subDir.children && hasArticles(subDir)) {
        children.push(subDir)
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const fileStat = await fs.stat(entryPath)
      const fileEdited = fileStat.mtime.toISOString()

      const articleName = entry.name.replace(/\.md$/, '')

      children.push({
        name: articleName,
        type: 'article' as FileNodeType,
        edited: fileEdited
      })
    }
  }

  return {
    name: dirName,
    type: 'folder' as FileNodeType,
    edited,
    children
  }
}
