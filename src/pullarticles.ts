import fs from 'fs/promises'
import path from 'path'
import {Octokit} from 'octokit'

import type {SupportedLanguage} from './types'

interface PullArticlesConfig {
  articlePath: string
  githubToken?: string
  sourceUrl: string
}

const IGNORE_LIST: string[] = ['README.md', '.git', '.gitignore']

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
 * Download individual markdown file
 * @param octokit Octokit client
 * @param owner Repository owner
 * @param repo Repository name
 * @param item File item details
 * @param articlesDir Destination directory
 */
async function downloadMarkdownFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  item: {path: string; name: string},
  articlesDir: string
): Promise<void> {
  try {
    const {data} = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: item.path
    })

    // Decode file content (GitHub API returns base64 encoded content)
    const fileContent = Buffer.from(data.content, 'base64').toString('utf-8')

    const localFilePath = path.join(articlesDir, item.path)
    await fs.mkdir(path.dirname(localFilePath), {recursive: true})
    await fs.writeFile(localFilePath, fileContent)

    console.log(`Downloaded: ${item.path}`)
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
 */
async function processRepoContents(
  octokit: Octokit,
  owner: string,
  repo: string,
  repoPath: string = '',
  articlesDir: string
): Promise<void> {
  try {
    const {data: contents} = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: repoPath
    })

    for (const item of Array.isArray(contents) ? contents : [contents]) {
      if (IGNORE_LIST.includes(item.name) || 
          IGNORE_LIST.some(ignored => item.path.includes(`/${ignored}`))) {
        console.log(`Skipped: ${item.path}`)
        continue
      }

      if (item.type === 'dir') {
        await processRepoContents(octokit, owner, repo, item.path, articlesDir)
      } else if (item.type === 'file' && item.name.endsWith('.md')) {
        await downloadMarkdownFile(octokit, owner, repo, item, articlesDir)
      }
    }
  } catch (error) {
    console.error(`Error processing repository path ${repoPath}:`, error)
    throw error
  }
}

/**
 * Pull articles from a GitHub repository
 * @param articlePath Destination path for articles
 * @param config Configuration options
 */
async function pullArticles(
  articlePath: string,
  config?: {
    githubToken?: string
    sourceUrl?: string
  }
): Promise<void> {
  try {
    // Use environment variables if not provided
    const githubToken = config?.githubToken || process.env.GITHUB_TOKEN
    const sourceUrl = config?.sourceUrl || process.env.SOURCE

    if (!sourceUrl) {
      throw new Error('Missing SOURCE environment variable')
    }

    const octokit = createOctokitClient(githubToken)

    const {owner, repo} = parseRepoDetails(sourceUrl)

    const articlesDir = path.resolve(process.cwd(), articlePath)
    await fs.mkdir(articlesDir, {recursive: true})

    // Start processing from root
    await processRepoContents(octokit, owner, repo, '', articlesDir)

    console.log('Article pull completed successfully')
  } catch (error) {
    console.error('Error pulling articles:', error)
    throw error
  }
}

export default pullArticles
