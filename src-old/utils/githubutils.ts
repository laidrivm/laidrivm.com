import {Octokit} from 'octokit'
import {Buffer} from 'buffer/'

import type {FileNode, RepoConfig} from '../types.ts'

import {getBaseName, safePath, getDir} from './pathutils.ts'
import {writeTextFile, createDir} from './fileutils.ts'

/**
 * List of files to ignore when processing repositories
 */
const IGNORE_LIST = ['README.md', '.git', '.gitignore', 'LICENSE', '.github']

/**
 * Check if a path should be ignored
 * @param path - File path
 * @param name - File name
 * @returns Whether the path should be ignored
 */
function isIgnored(path: string, name: string): boolean {
  return (
    IGNORE_LIST.includes(name) ||
    IGNORE_LIST.some(ignored => path.includes(`/${ignored}`))
  )
}

/**
 * Create Octokit instance based on authentication
 * @param githubToken - GitHub authentication token
 * @returns Octokit instance
 */
function createOctokitClient(githubToken?: string): Octokit {
  return githubToken && githubToken !== 'unauth'
    ? new Octokit({auth: githubToken})
    : new Octokit()
}

/**
 * Parse GitHub repository details from URL
 * @param sourceUrl - GitHub repository URL
 * @returns Repository owner and name
 */
export function parseRepoDetails(sourceUrl: string): RepoConfig {
  const repoUrl = new URL(sourceUrl)
  const [owner, repo] = repoUrl.pathname.split('/').filter(Boolean)

  if (!owner || !repo) {
    throw new Error(`Invalid repository URL: ${sourceUrl}`)
  }

  return {owner, repo}
}

/**
 * Fetches repository contents for a specific path
 * @param octokit - Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param repoPath - Path within repository
 * @returns Repository contents
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
 * @param octokit - Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param repoPath - Path within repository
 * @returns ISO date string of last commit
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

  return (
    data[0]?.commit?.committer?.date ||
    data[0]?.commit?.author?.date ||
    new Date().toISOString()
  )
}

/**
 * Fetches the date of the first commit for a specific path
 * @param octokit - Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param repoPath - Path within repository
 * @returns ISO date string of first commit
 */
async function getFirstCommitDate(
  octokit: Octokit,
  owner: string,
  repo: string,
  repoPath: string
): Promise<string> {
  const {data} = await octokit.rest.repos.listCommits({
    owner,
    repo,
    path: repoPath,
    per_page: 100
  })

  const firstCommit = data[data.length - 1]
  return (
    firstCommit?.commit?.committer?.date ||
    firstCommit?.commit?.author?.date ||
    new Date().toISOString()
  )
}

/**
 * Download file from GitHub repository
 * @param octokit - Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param path - File path in repository
 * @param name - File name
 * @param articlesDir - Local directory to save file
 * @returns File node metadata
 */
async function downloadFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  name: string,
  articlesDir: string
): Promise<FileNode> {
  try {
    const data = await getRepoContents(octokit, owner, repo, path)
    const latestCommitDate = await getLastCommitDate(octokit, owner, repo, path)
    const firstCommitDate = await getFirstCommitDate(octokit, owner, repo, path)

    // Decode file content (GitHub API returns base64 encoded content)
    const fileContent = Buffer.from(data.content, 'base64')

    const localFilePath = safePath(articlesDir, path)
    await createDir(getDir(localFilePath))

    if (name.endsWith('.md')) {
      // For markdown files, convert to utf-8 string before writing
      await writeTextFile(localFilePath, fileContent.toString('utf-8'))
    } else {
      // For binary files like images, write the buffer directly
      await Bun.write(localFilePath, fileContent)
    }

    console.log(`Downloaded: ${path}`)

    return {
      name: getBaseName(name).replace(/\.md$/, ''),
      type: name.endsWith('.md') ? 'article' : 'misc',
      edited: latestCommitDate,
      created: firstCommitDate
    }
  } catch (error) {
    console.error(`File download error: ${path}`, error)
    throw error
  }
}

/**
 * Check if a directory node contains any articles (directly or nested)
 * @param node - Directory node to check
 * @returns Whether node contains articles
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
 * Recursively process repository contents
 * @param octokit - Octokit instance
 * @param config - Repository configuration
 * @param repoPath - Current path in repository
 * @param articlesPath - Local directory to save files
 * @returns Directory structure
 */
async function processRepoContents(
  octokit: Octokit,
  config: RepoConfig,
  repoPath: string,
  articlesPath: string
): Promise<FileNode> {
  try {
    const {owner, repo} = config
    const contents = await getRepoContents(octokit, owner, repo, repoPath)
    const latestCommitDate = await getLastCommitDate(
      octokit,
      owner,
      repo,
      repoPath
    )
    const firstCommitDate = await getFirstCommitDate(
      octokit,
      owner,
      repo,
      repoPath
    )
    const children: FileNode[] = []

    for (const item of Array.isArray(contents) ? contents : [contents]) {
      if (isIgnored(item.path, item.name)) {
        console.log(`Skipped: ${item.path}`)
        continue
      }

      if (item.type === 'dir') {
        const subDir = await processRepoContents(
          octokit,
          config,
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
          item.path,
          item.name,
          articlesPath
        )
        if (file.type === 'article') {
          children.push(file)
        }
      }
    }

    return {
      name: getBaseName(repoPath) || 'root',
      type: 'folder',
      edited: latestCommitDate,
      created: firstCommitDate,
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
 * Pull content from a GitHub repository
 * @param repoUrl - Repository URL
 * @param token - GitHub token
 * @param articlesPath - Local directory to save files
 * @returns Directory structure
 */
export async function pullFromGitHub(
  repoUrl: string,
  token: string,
  articlesPath: string
): Promise<FileNode> {
  try {
    const octokit = createOctokitClient(token)
    const repoConfig = parseRepoDetails(repoUrl)

    await createDir(articlesPath)
    return await processRepoContents(octokit, repoConfig, '', articlesPath)
  } catch (error) {
    console.error('Error pulling from GitHub:', error)
    throw error
  }
}
