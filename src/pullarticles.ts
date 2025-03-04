import fs from 'fs/promises';
import path from 'path';
import { Octokit } from 'octokit';

async function pullArticles(articlesPath: string) {
  try {
    if (!process.env.SOURCE) {
      throw new Error('Missing SOURCE environment variable');
    }

    const octokit = process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'unauth'
      ? new Octokit({ auth: process.env.GITHUB_TOKEN })
      : new Octokit();

    const repoUrl = new URL(process.env.SOURCE);
    const [owner, repo] = repoUrl.pathname.split('/').filter(Boolean);

    const articlesDir = path.resolve(process.cwd(), articlesPath);
    await fs.mkdir(articlesDir, { recursive: true });

    const { data: contents } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: ''
    });

    async function processRepoContents(repoPath = '') {
      try {
        const { data: contents } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: repoPath
        });

        for (const item of contents) {
          if (item.name === 'README.md' && repoPath === '') {
            continue;
          }

          if (item.type === 'dir') {
            await processRepoContents(item.path);
          } else if (item.type === 'file' && item.name.endsWith('.md')) {
            const { data } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: item.path
            });

            // Decode file content (GitHub API returns base64 encoded content)
            const fileContent = Buffer.from(data.content, 'base64').toString('utf-8');

            const localFilePath = path.join(articlesDir, item.path);
            await fs.mkdir(path.dirname(localFilePath), { recursive: true });
            await fs.writeFile(localFilePath, fileContent);

            console.log(`Downloaded: ${item.path}`);
          }
        }
      } catch (error) {
        console.error(`Error processing path ${repoPath}:`, error);
        throw error;
      }
    }

    // Start processing from root
    await processRepoContents();

    console.log('Article pull completed successfully');
  } catch (error) {
    console.error('Error pulling articles:', error);
    throw error;
  }
}

export default pullArticles;
