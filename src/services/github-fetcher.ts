import {Buffer} from 'buffer/'
import {Octokit} from 'octokit'

import {ok, err, isIgnored, getFileType} from '../utils.ts'
import type {
  FileInfo,
  ServiceResponse,
  FileCollection,
  GenerateType
} from '../types.ts'

import {isCacheValid, invalidateCache, storeInCache} from './cache.ts'

/**
 * Creates Octokit instance with proper configuration
 * @returns Configured Octokit instance
 */
function createOctokit(): Octokit {
  console.log('Creating Octokit instance')
  return new Octokit({
    auth: process.env.GITHUB_TOKEN
  })
}

function isBinaryFile(path: string): boolean {
  const binaryExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.ico',
    '.svg',
    '.pdf',
    '.zip',
    '.tar',
    '.gz',
    '.7z',
    '.rar',
    '.mp3',
    '.mp4',
    '.avi',
    '.mov',
    '.wmv',
    '.ttf',
    '.otf',
    '.woff',
    '.woff2',
    '.eot',
    '.exe',
    '.dmg',
    '.pkg',
    '.deb',
    '.rpm'
  ]

  const ext = path.toLowerCase().substring(path.lastIndexOf('.'))
  return binaryExtensions.includes(ext)
}

/**
 * Fetches single file content from GitHub
 * @param octokit - Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param path - File path
 * @returns File content result
 */
async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<ServiceResponse<FileInfo>> {
  try {
    const {data: fileInfo} = await octokit.rest.repos.getContent({
      owner,
      repo,
      path
    })

    // Ensure it's a file, not a directory
    if (!('type' in fileInfo) || fileInfo.type !== 'file') {
      return err(new Error(`Path ${path} is not a file`))
    }

    if (isBinaryFile(path)) {
      // Binary files are returned as base64 in the content field
      if (!fileInfo.content) {
        return err(new Error(`No content found for binary file ${path}`))
      }

      // Decode base64 to Buffer
      const buffer = Buffer.from(fileInfo.content, 'base64')

      return ok({
        sourcePath: path,
        content: buffer,
        sha: fileInfo.sha,
        size: fileInfo.size,
        type: getFileType(path),
        isBinary: true
      })
    } else {
      // For text files, fetch raw content
      const {data: content} = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        mediaType: {format: 'raw'}
      })

      if (typeof content !== 'string') {
        return err(new Error(`Expected string content for text file ${path}`))
      }

      return ok({
        sourcePath: path,
        content: content,
        sha: fileInfo.sha,
        size: fileInfo.size,
        type: getFileType(path),
        isBinary: false
      })
    }
  } catch (error) {
    return err(error)
  }
}

/**
 
 * Gets the last modified date for a file from its commit history
 * @param octokit - Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param path - File path
 * @returns Last modified date
 
 */

async function getFileLastModified(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<Date> {
  try {
    const {data: commits} = await octokit.rest.repos.listCommits({
      owner,
      repo,
      path,
      per_page: 1 // Only get the most recent commit
    })

    if (commits.length > 0) {
      const lastCommit = commits[0]
      console.log(
        `Last modified date for ${path} found: ${lastCommit.commit.author?.date}${lastCommit.commit.committer?.date}`
      )
      return new Date(
        lastCommit.commit.author?.date || lastCommit.commit.committer?.date
      )
    }
  } catch (error) {
    console.warn(`Failed to get last modified date for ${path}:`, error)
  }
  return new Date()
}

/**
 * Gets the latest commit SHA for the repository
 * @param octokit - Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param path - Optional specific path
 * @returns Latest commit SHA or null
 */
async function getLastCommitSha(
  octokit: Octokit,
  owner: string,
  repo: string,
  path?: string
): Promise<string | null> {
  console.log(`getLastCommitSha is called for ${owner}, ${repo} and ${path}`)
  try {
    if (path) {
      const {data: commits} = await octokit.rest.repos.getCommit({
        owner,
        repo,
        path,
        per_page: 1 // only need the latest commit
      })
      return commits[0]?.sha || null
    } else {
      const {data: commits} = await octokit.rest.repos.getCommit({
        owner,
        repo,
        per_page: 1 // only need the latest commit
      })
      return commits[0]?.sha || null
    }
  } catch (error) {
    console.error(`Error getting last commit: ${error}`)
    return null
  }
}

/**
 * Recursively fetches repository file tree
 * @param octokit - Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param path - Current path (for recursion)
 * @returns Repository content result
 */
async function fetchRepositoryContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path = ''
): Promise<ServiceResponse<FileInfo[]>> {
  const files: FileInfo[] = []

  const {data: contents} = await octokit.rest.repos.getContent({
    owner,
    repo,
    path
    // ref, The name of the commit/branch/tag. Defaults to the repository’s default branch if not specified.
  })

  const items = Array.isArray(contents) ? contents : [contents]

  for (const item of items) {
    if (item.type === 'file') {
      if (isIgnored(item.path, item.name)) {
        console.log(`Skipped because of ignore list: ${item.path}`)
        continue
      }

      const fileSha = await getLastCommitSha(octokit, owner, repo, item.path)
      if (isCacheValid(item.path, fileSha)) {
        console.log(`Content for ${item.path} is cached`)
        continue
      }
      invalidateCache(item.path)

      const fileResult = await fetchFileContent(octokit, owner, repo, item.path)
      if (!fileResult.success) {
        console.error(`Failed to fetch ${item.path}:`, fileResult.error.message)
        continue
      }

      const lastModified = await getFileLastModified(
        octokit,
        owner,
        repo,
        item.path
      )

      const fileInfo: FileInfo = {
        sourcePath: item.path,
        content: fileResult.data.content,
        isBinary: fileResult.data.isBinary,
        sha: fileSha,
        size: fileResult.data.size,
        lastModified,
        type: getFileType(item.path)
      }

      files.push(fileInfo)
      const cachingResult = await storeInCache(fileInfo)
      fileInfo.localPath = cachingResult.data
    } else if (item.type === 'dir') {
      const subdirResult = await fetchRepositoryContent(
        octokit,
        owner,
        repo,
        item.path
      )

      if (subdirResult.success) {
        files.push(...subdirResult.data)
      }
    }
  }

  return ok(files)
}

/**
 * Fetches complete repository content with caching
 * @returns Repository content result
 */
export async function fetchGitHubContent(
  mode: GenerateType
): Promise<ServiceResponse<FileCollection>> {
  if (mode === 'local') {
    console.log(`Generating files in local mode, no need to fetch repository`)
    return ok({
      files: [],
      lastFetch: null,
      repoSha: null,
      mode
    })
  }

  const octokit = createOctokit()

  const repoUrl = new URL(process.env.GITHUB_REPO)
  const [owner, repo] = repoUrl.pathname.split('/').filter(Boolean)
  console.log(
    `Trying to fetch repository content for owner: ${owner} and repo: ${repo}`
  )

  const latestSha = await getLastCommitSha(octokit, owner, repo)
  if (!latestSha) {
    return err(new Error('No commits found in the repository'))
  }
  console.log(`Latest commit SHA: ${latestSha}`)

  const filesResult = await fetchRepositoryContent(octokit, owner, repo, '')

  const repoContent = {
    files: filesResult.data,
    lastFetch: new Date(),
    repoSha: latestSha,
    mode
  }

  console.log(
    `Content fetched for SHA ${repoContent.repoSha} at ${repoContent.lastFetch}`
  )

  return ok(repoContent)
}
