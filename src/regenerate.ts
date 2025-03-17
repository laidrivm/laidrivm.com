import {join} from 'path'

import {processRemoteSource} from './processsources.ts'
//import {getLanguageFromPath} from './processpages.tsx'
import type {FileNode} from './types.ts'

/**
 * Get a flattened map of all articles in a tree structure
 * @param node Root FileNode
 * @param basePath Base path for keys
 * @returns Map of article paths to FileNode objects
 */
function getArticlesMap(node: FileNode, basePath = ''): Map<string, FileNode> {
  const articlesMap = new Map<string, FileNode>()
  const currentPath = basePath ? `${basePath}/${node.name}` : node.name

  if (node.type === 'article') {
    articlesMap.set(currentPath, node)
  }

  if (node.children) {
    for (const child of node.children) {
      const childMap = getArticlesMap(child, currentPath)
      for (const [path, childNode] of childMap.entries()) {
        articlesMap.set(path, childNode)
      }
    }
  }

  return articlesMap
}

/**
 * Get the last edited date from HTML file metadata
 * @param htmlPath Path to the HTML file
 * @returns Last edit date or null if not found
 */
async function getHtmlLastEditDate(htmlPath: string): Promise<string | null> {
  try {
    const htmlFile = Bun.file(htmlPath)

    if (!(await htmlFile.exists())) {
      return null
    }

    const html = await htmlFile.text()

    // Extract time from the HTML metadata
    // This assumes the time is stored in a meta tag or similar pattern
    const timeMatch = html.match(
      /<meta\s+name="last-modified"\s+content="([^"]+)"/i
    )

    return timeMatch ? timeMatch[1] : null
  } catch (error) {
    console.error(`Error getting HTML edit date: ${error}`)
    return null
  }
}

/**
 * Compare current file with remote file and determine if update is needed
 * @param node FileNode from remote source
 * @param htmlPath Path to the existing HTML file
 * @returns True if update is needed
 */
async function needsUpdate(node: FileNode, htmlPath: string): Promise<boolean> {
  const htmlEditDate = await getHtmlLastEditDate(htmlPath)

  if (!htmlEditDate) {
    // If HTML doesn't exist or date not found, update is needed
    return true
  }

  // Compare dates
  const remoteDate = new Date(node.edited)
  const localDate = new Date(htmlEditDate)

  return remoteDate > localDate
}

/**
 * Regenerate content from remote repository, updating only changed articles
 * @returns Success status
 */
export async function regenerate(): Promise<boolean> {
  try {
    console.log('Starting selective content regeneration...')
    const nodes = await processRemoteSource()

    const articlesMap = getArticlesMap(nodes)
    const updatedPaths: string[] = []

    for (const [path, node] of articlesMap.entries()) {
      const pathParts = path.split('/')
      const articleName = pathParts.pop() || ''
      const relativePath = pathParts.join('/')

      //const sourcePath = join(process.env.ARTICLES, relativePath)
      const destPath = join(process.env.PUBLIC, relativePath)
      //const language = getLanguageFromPath(destPath)

      const outputFilePath = join(destPath, articleName, 'index.html')

      if (await needsUpdate(node, outputFilePath)) {
        console.log(`Updating article: ${path}`)
        /*
        //ToDo: create a separate nodelist of articles
        // and update them using processArticles()
        const updated = await processArticleFile(
          sourcePath,
          destPath,
          node,
          language,
          articlesPath,
          outputPath
        )
        
        if (updated) {
          updatedPaths.push(path)
        }*/
      }
    }

    console.log(`Updated ${updatedPaths.length} articles`)
    /*
//ToDo: write a function to update index pages
    if (updatedPaths.length > 0) {
      await updateAffectedIndexPages(
        updatedPaths,
        nodes,
        articlesPath,
        outputPath
      )
    }
*/
    console.log('Selective content regeneration completed successfully')
    return true
  } catch (error) {
    console.error('Error during content regeneration:', error)
    return false
  }
}
