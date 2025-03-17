import fs from 'node:fs/promises'
import {join, dirname, basename, parse} from 'path'

import {Octokit} from 'octokit'
import {Buffer} from 'buffer/'

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
export async function processLocalSource(
  articlesPath: string
): Promise<FileNode> {
  const dirStat = await fs.stat(articlesPath)
  const edited = dirStat.mtime.toISOString()

  const children: FileNode[] = []
  const entries = await fs.readdir(articlesPath, {withFileTypes: true})

  for (const entry of entries) {
    const entryPath = join(articlesPath, entry.name)

    if (entry.isDirectory()) {
      const subDir = await processLocalSource(entryPath)

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
    name: articlesPath,
    type: 'folder' as FileNodeType,
    edited,
    children
  }
}

/**
 * Create Octokit instance based on authentication
 * @param githubToken GitHub authentication token
 * @returns Octokit instance
 */
function createOctokitClient(githubToken?: string): Octokit {
  return githubToken && githubToken !== 'unauth'
    ? new Octokit({auth: githubToken})
    : new Octokit()
}

/**
 * Parse GitHub repository details from URL
 * @param sourceUrl GitHub repository URL
 * @returns Object with owner and repo
 */
function parseRepoDetails(sourceUrl: string): {owner: string; repo: string} {
  const repoUrl = new URL(sourceUrl)
  const [owner, repo] = repoUrl.pathname.split('/').filter(Boolean)

  if (!owner || !repo) {
    throw new Error('Invalid repository URL')
  }

  return {owner, repo}
}

function isIgnored(item: {path: string; name: string}): boolean {
  const ignoreList = ['README.md', '.git', '.gitignore', 'LICENSE']
  return (
    ignoreList.includes(item.name) ||
    ignoreList.some(ignored => item.path.includes(`/${ignored}`))
  )
}

/**
 * Fetches repository contents for a specific path
 * @param octokit - The Octokit instance
 * @param owner - The repository owner
 * @param repo - The repository name
 * @param repoPath - The file or directory path within the repository
 * @returns The contents data
 */
async function getRepoContents(
  octokit: Octokit,
  owner: string,
  repo: string,
  repoPath: string
): Promise<Octokit.ReposGetContentResponseData> {
  const {data} = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: repoPath
  })

  return data
}

/**
 * Fetches the date of the last commit for a specific path
 * @param octokit - The Octokit instance
 * @param owner - The repository owner
 * @param repo - The repository name
 * @param repoPath - The file or directory path within the repository
 * @returns The date of the last commit
 */
async function getLastCommitDate(
  octokit: Octokit,
  owner: string,
  repo: string,
  repoPath: string
): Promise<string> {
  const {data} = await octokit.rest.repos.listCommits({
    owner,
    repo,
    path: repoPath,
    per_page: 1
  })

  return data[0]?.commit?.committer?.date || data[0]?.commit?.author?.date
}

/**
 * Download both markdowns and images
 * @param octokit Octokit client
 * @param owner Repository owner
 * @param repo Repository name
 * @param item File item details
 * @param articlesDir Destination directory
 */
async function downloadFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  item: {path: string; name: string},
  articlesDir: string
): Promise<FileNode> {
  try {
    const data = await getRepoContents(octokit, owner, repo, item.path)
    const latestCommitDate = await getLastCommitDate(
      octokit,
      owner,
      repo,
      item.path
    )

    // Decode file content (GitHub API returns base64 encoded content)
    const fileContent = Buffer.from(data.content, 'base64')

    const localFilePath = join(articlesDir, item.path)
    await fs.mkdir(dirname(localFilePath), {recursive: true})

    if (item.name.endsWith('.md')) {
      // For markdown files, convert to utf-8 string before writing
      await fs.writeFile(localFilePath, fileContent.toString('utf-8'))
    } else {
      // For binary files like images, write the buffer directly
      await fs.writeFile(localFilePath, fileContent)
    }

    console.log(`Downloaded: ${item.path}`)

    return {
      name: parse(item.name).name,
      type: item.name.endsWith('.md')
        ? ('article' as FileNodeType)
        : ('misc' as FileNodeType),
      edited: latestCommitDate
    }
  } catch (error) {
    console.error(`File download error: ${item.path}`, error)
  }
}

/**
 * Recursively process repository contents
 * @param octokit Octokit client
 * @param owner Repository owner
 * @param repo Repository name
 * @param repoPath Current repository path
 * @param articlesDir Destination directory
 * @returns Directory structure
 */
async function processRepoContents(
  octokit: Octokit,
  owner: string,
  repo: string,
  repoPath: string,
  articlesPath: string
): Promise<FileNode> {
  try {
    const contents = await getRepoContents(octokit, owner, repo, repoPath)
    const latestCommitDate = await getLastCommitDate(
      octokit,
      owner,
      repo,
      repoPath
    )
    const children: FileNode[] = []

    for (const item of Array.isArray(contents) ? contents : [contents]) {
      if (isIgnored(item)) {
        console.log(`Skipped: ${item.path}`)
        continue
      }
      if (item.type === 'dir') {
        const subDir = await processRepoContents(
          octokit,
          owner,
          repo,
          item.path,
          articlesPath
        )
        if (
          subDir.type === 'folder' &&
          subDir.children &&
          hasArticles(subDir)
        ) {
          children.push(subDir)
        }
      } else if (item.type === 'file') {
        const file = await downloadFile(
          octokit,
          owner,
          repo,
          item,
          articlesPath
        )
        if (file.type === 'article') {
          children.push(file)
        }
      }
    }
    return {
      name: basename(repoPath),
      type: 'folder' as FileNodeType,
      edited: latestCommitDate,
      children
    }
  } catch (error) {
    console.error(
      `Error processing files for repository path ${repoPath}:`,
      error
    )
    throw error
  }
}

/**
 * Pull articles and images from a GitHub repository
 * @returns Directory structure
 */
export async function processRemoteSource(): Promise<FileNode> {
  try {
    const octokit = createOctokitClient(process.env.GITHUB_TOKEN)
    const {owner, repo} = parseRepoDetails(process.env.SOURCE)

    await fs.mkdir(process.env.ARTICLES, {recursive: true})
    return await processRepoContents(
      octokit,
      owner,
      repo,
      '',
      process.env.ARTICLES
    )
  } catch (error) {
    console.error('Error pulling articles and images:', error)
    throw error
  }
}
