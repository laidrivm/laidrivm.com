import fs from 'fs/promises'
import path from 'path'

import {Octokit} from 'octokit'
import {Buffer} from 'buffer/'

const IGNORE_LIST: string[] = ['README.md', '.git', '.gitignore']
const IMAGE_EXTENSIONS: string[] = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp'
]

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
 * Check if a file is an image based on its extension
 * @param filename Filename to check
 * @returns Boolean indicating if file is an image
 */
function isImage(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return IMAGE_EXTENSIONS.includes(ext)
}

/**
 * Download both markdowns or images
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
): Promise<void> {
  try {
    const {data} = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: item.path
    })

    // Decode file content (GitHub API returns base64 encoded content)
    const fileContent = Buffer.from(data.content, 'base64')

    const localFilePath = path.join(articlesDir, item.path)
    await fs.mkdir(path.dirname(localFilePath), {recursive: true})

    if (item.name.endsWith('.md')) {
      // For markdown files, convert to utf-8 string before writing
      await fs.writeFile(localFilePath, fileContent.toString('utf-8'))
    } else {
      // For binary files like images, write the buffer directly
      await fs.writeFile(localFilePath, fileContent)
    }

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
  repoPath = '',
  articlesDir: string
): Promise<void> {
  try {
    const {data: contents} = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: repoPath
    })

    for (const item of Array.isArray(contents) ? contents : [contents]) {
      if (
        IGNORE_LIST.includes(item.name) ||
        IGNORE_LIST.some(ignored => item.path.includes(`/${ignored}`))
      ) {
        console.log(`Skipped: ${item.path}`)
        continue
      }

      if (item.type === 'dir') {
        await processRepoContents(octokit, owner, repo, item.path, articlesDir)
      } else if (
        item.type === 'file' &&
        (item.name.endsWith('.md') || isImage(item.name))
      ) {
        await downloadFile(octokit, owner, repo, item, articlesDir)
      }
    }
  } catch (error) {
    console.error(`Error processing repository path ${repoPath}:`, error)
    throw error
  }
}

/**
 * Pull articles and images from a GitHub repository
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
    const githubToken = config?.githubToken || process.env.GITHUB_TOKEN
    const sourceUrl = config?.sourceUrl || process.env.SOURCE

    const octokit = createOctokitClient(githubToken)

    const {owner, repo} = parseRepoDetails(sourceUrl)

    const articlesDir = path.resolve(process.cwd(), articlePath)
    await fs.mkdir(articlesDir, {recursive: true})

    await processRepoContents(octokit, owner, repo, '', articlesDir)

    console.log('Article and image pull completed successfully')
  } catch (error) {
    console.error('Error pulling articles and images:', error)
    throw error
  }
}

export default pullArticles
