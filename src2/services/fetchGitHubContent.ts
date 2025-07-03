import {Octokit} from 'octokit'

import {ok, err} from '../utils.ts'
import type {FileInfo, ServiceResponse, GitHubRepoContent} from '../types.ts'

import {
  getFromCache,
  isCacheValid,
  invalidateCache,
  storeInCache
} from './cache.ts'

/**
 * Creates Octokit instance with proper configuration
 * @returns Configured Octokit instance
 */
function createOctokit(): Octokit {
  console.log('Creating Octokit instance')
  return new Octokit({
    auth: process.env.GITHUB_TOKEN,
    throttle: {
      onRateLimit: (retryAfter, options) => {
        console.warn(
          `GitHub rate limit hit. Retrying after ${retryAfter} seconds`
        )
        if (options.request.retryCount < 3) {
          return true
        }
      },
      onSecondaryRateLimit: (retryAfter, options) => {
        console.warn(
          `GitHub secondary rate limit hit. Retrying after ${retryAfter} seconds`
        )
        if (options.request.retryCount === 0) {
          return true
        }
      }
    },
    retry: {
      doNotRetry: ['429'] // Handle rate limiting with throttle plugin
    }
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

    if (Array.isArray(fileInfo) || fileInfo.type !== 'file') {
      return err(
        new Error(
          `Expected file, got ${Array.isArray(fileInfo) ? 'directory' : fileInfo.type}`
        )
      )
    }

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
): Promise<ServiceResponse<GitHubRepoContent>> {
  try {
    const files = new Map<string, FileInfo>()

    const {data: contents} = await octokit.rest.repos.getContent({
      owner,
      repo,
      path
      // ref, The name of the commit/branch/tag. Defaults to the repository’s default branch if not specified.
    })

    const items = Array.isArray(contents) ? contents : [contents]

    for (const item of items) {
      if (item.type === 'file') {
        const fileResult = await fetchFileContent(
          octokit,
          owner,
          repo,
          item.path
        )
        if (!fileResult.success) {
          console.error(
            `Failed to fetch ${item.path}:`,
            fileResult.error.message
          )
          continue
        }

        const lastModified = await getFileLastModified(
          octokit,
          owner,
          repo,
          path
        )

        const fileInfo: FileInfo = {
          path: item.path,
          content: fileResult.data.content,
          sha: fileResult.data.sha,
          size: fileResult.data.size,
          lastModified,
          type: 'file'
        }

        files.set(item.path, fileInfo)
      } else if (item.type === 'dir') {
        const subdirResult = await fetchRepositoryContent(
          octokit,
          owner,
          repo,
          item.path
        )

        if (subdirResult.success) {
          for (const [filePath, fileInfo] of subdirResult.data) {
            files.set(filePath, fileInfo)
          }
        }
      }
    }

    return ok(files)
  } catch (error) {
    return err(error)
  }
}

/**
 * Fetches complete repository content with caching
 * @returns Repository content result
 */
export async function fetchGitHubContent(): Promise<
  ServiceResponse<GitHubRepoContent>
> {
  try {
    const octokit = createOctokit()

    const repoUrl = new URL(process.env.GITHUB_REPO)
    const [owner, repo] = repoUrl.pathname.split('/').filter(Boolean)

    console.log(
      `Trying to fetch repository content for owner: ${owner} and repo: ${repo}`
    )

    // Get latest commit SHA for cache invalidation - use the correct endpoint
    const {data: latestCommit} = await octokit.rest.repos.listCommits({
      owner,
      repo,
      per_page: 1 // Only get the most recent commit
    })

    if (latestCommit.length === 0) {
      return err(new Error('No commits found in repository'))
    }

    const currentSha = latestCommit[0].sha
    console.log(`Latest commit SHA: ${currentSha}`)

    // Check cache first
    const cachedContent = getFromCache(owner, repo)
    if (
      cachedContent &&
      isCacheValid({content: cachedContent, timestamp: Date.now()}, currentSha)
    ) {
      console.log(
        `Using cached content for ${owner}/${repo} (SHA: ${currentSha})`
      )
      return ok(cachedContent)
    }

    // Invalidate old cache if it exists
    if (cachedContent) {
      invalidateCache(owner, repo)
    }

    // Fetch fresh content
    console.log(`Fetching fresh content for ${owner}/${repo}`)
    const filesResult = await fetchRepositoryContent(octokit, owner, repo, '')

    if (!filesResult.success) {
      return filesResult
    }

    const repoContent: GitHubRepoContent = {
      files: filesResult.data,
      lastFetch: new Date(),
      repoSha: currentSha
    }

    // Store in cache
    storeInCache(owner, repo, repoContent)

    console.log(
      `Content fetched for SHA ${repoContent.repoSha} at ${repoContent.lastFetch}`
    )

    return ok(repoContent)
  } catch (error) {
    return err(error)
  }
}
