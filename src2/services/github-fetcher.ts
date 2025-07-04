import {Octokit} from 'octokit'

import {ok, err} from '../utils.ts'
import type {FileInfo, ServiceResponse, FileCollection} from '../types.ts'

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
    const {data} = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      mediaType: {format: 'raw'}
    })

    if (typeof data !== 'string') {
      return err(new Error(`Expected file content, got ${typeof data}`))
    }

    // Get file info for SHA and size
    const {data: fileInfo} = await octokit.rest.repos.getContent({
      owner,
      repo,
      path
    })

    return ok({
      content: data,
      sha: fileInfo.sha,
      size: fileInfo.size
    })
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
  try {
    if (path) {
      const {data: commits} = await octokit.rest.repos.listCommits({
        owner,
        repo,
        path,
        sha: 'main',
        per_page: 1 // only need the latest commit
      })
      return commits[0]?.sha || null
    } else {
      const {data: commits} = await octokit.rest.repos.listCommits({
        owner,
        repo,
        sha: 'main',
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
      const fileSha = await getLastCommitSha(octokit, owner, repo, item.path)
      if (isCacheValid(fileSha, item.path)) {
        console.log(`Content for ${item.path} is cached)`)
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
        sha: fileResult.data.sha,
        size: fileResult.data.size,
        lastModified,
        type: 'file'
      }

      files.push(fileInfo)
      storeInCache(fileInfo)
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

  if (files.length > 0) {
    return ok(files)
  }
  return err(new Error(`No files fetched`))
}

/**
 * Fetches complete repository content with caching
 * @returns Repository content result
 */
export async function fetchGitHubContent(): Promise<
  ServiceResponse<FileCollection>
> {
  const octokit = createOctokit()

  const repoUrl = new URL(process.env.GITHUB_REPO)
  const [owner, repo] = repoUrl.pathname.split('/').filter(Boolean)
  console.log(
    `Trying to fetch repository content for owner: ${owner} and repo: ${repo}`
  )

  const latestSha = await getLastCommitSha(octokit, owner, repo)
  if (!latestSha) {
    return err(new Error('No commits found in repository'))
  }
  console.log(`Latest commit SHA: ${latestSha}`)

  const filesResult = await fetchRepositoryContent(octokit, owner, repo, '')

  if (!filesResult.success) {
    return filesResult
  }

  const repoContent = {
    files: filesResult.data,
    lastFetch: new Date(),
    repoSha: latestSha
  }

  console.log(
    `Content fetched for SHA ${repoContent.repoSha} at ${repoContent.lastFetch}`
  )

  return ok(repoContent)
}
