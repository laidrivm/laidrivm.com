import {readdir, stat} from 'node:fs/promises'
import {join} from 'path'

import {renderToString} from 'preact-render-to-string'
import {marked} from 'marked'
import xss from 'xss'

import type {Indexes} from './types.ts'
import Page from './components/page.tsx'
import Heading from './components/heading.tsx'
import ArticleList from './components/articlelist.tsx'
import CodeSnippet from './components/codesnippet.tsx'
import customWhiteList from './xssconfig.ts'

const dotEnv = await Bun.file('.env')

const xssOptions = {
  whiteList: customWhiteList
}

function generateId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function convertMarkdownToHtml(markdown: string): string {
  const renderer = new marked.Renderer()

  renderer.heading = header => {
    return renderToString(
      <Heading
        depth={header.depth}
        text={header.text}
        id={generateId(header.text)}
      />
    )
  }

  renderer.code = code => {
    return renderToString(
      <CodeSnippet lang={code.lang || 'plaintext'} text={code.text} />
    )
  }

  return marked(markdown, {renderer})
}

function extractTitle(markdown: string): string {
  const lines = markdown.split('\n')
  const untitled = 'Untitled'

  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.replace('# ', '')
    }
  }

  return untitled
}

function convertMarkdownToPlaintext(markdown: string): string {
  const renderer = new marked.Renderer()

  renderer.text = text => text.text
  renderer.link = link => link.text
  renderer.paragraph = paragraph => {
    let result = ""
    for (const token of paragraph.tokens){
      switch (token.type) {
        case 'link': {
          result += renderer.link(token);
          break;
        }
        case 'text': {
          result += renderer.text(token);
          break;
        }
        default: {
          const error = 'Token with "' + token.type + '" type was not found in convertMarkdownToPlaintext.';
          throw new Error(error);
        }
      }
    }
    return result
  }

  return marked(markdown, {renderer})
}

function extractDescription(markdown: string): string {
  const lines = markdown.split('\n')
  const emptyDescription = ''

  for (const line of lines) {
    if (/^\p{L}/u.test(line)) {
      return convertMarkdownToPlaintext(line)
    }
  }

  return emptyDescription
}

function extractOGImage(markdown: string): string {
  const lines = markdown.split('\n')
  const defaultImage = '/og_image-min.jpg'

  for (const line of lines) {
    const match = /!\[.*?\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g.exec(line)
    if (match) {
      return match[1];
    }
  }

  return defaultImage
}

async function generatePage(
  address: string,
  mdPath: string,
  outputPath: string,
  language: 'en' | 'ru' = 'en'
): string {
  try {
    const markdown = await Bun.file(mdPath).text()
    const contentHtml = xss(convertMarkdownToHtml(markdown), xssOptions)
    const title = extractTitle(markdown)
    const description = extractDescription(markdown)
    const image = extractOGImage(markdown)
    const fullJsx = (
      <Page
        address={address}
        title={title}
        description={description}
        image={image}
        content={contentHtml}
        lang={language}
        includeArrow={true}
      />
    )
    const html = '<!DOCTYPE html>\n' + renderToString(fullJsx)
    await Bun.write(outputPath, html)
    console.log(
      `Static page generated successfully at ${outputPath} with title ${title}`
    )
    return title
  } catch (error) {
    console.error(`Error generating HTML from Markdown: ${error}`)
  }
  return 'untitled'
}

async function generateIndexes(publicPath: string, indexes: Indexes) {
  try {
    for (const index of indexes) {
      const mdPath = `${index.path}/index.md`
      const markdown = await Bun.file(mdPath).text()
      const contentHtml = xss(convertMarkdownToHtml(markdown), xssOptions)
      const title = extractTitle(markdown)
      const description = extractDescription(markdown)
      const image = extractOGImage(markdown)
      const linksJsx = <ArticleList links={index.links} />
      const indexAddress =
        index.language === 'en'
          ? `https://${process.env.ADDRESS}/`
          : `https://${process.env.ADDRESS}/${index.language}/`
      const fullJsx = (
        <Page
          address={indexAddress}
          title={title}
          description={description}
          image={image}
          content={`${contentHtml}${renderToString(linksJsx)}`}
          lang={index.language}
        />
      )
      const outputPath =
        index.language === 'en'
          ? `${publicPath}/index.html`
          : `${publicPath}/${index.language}/index.html`
      const html = '<!DOCTYPE html>\n' + renderToString(fullJsx)
      await Bun.write(outputPath, html)
      console.log(`${index.language} index page generated successfully.`)
    }
  } catch (error) {
    console.error(`Error generating index HTML from Markdown: ${error}`)
  }
}

function languageFromPath(path: string) {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 1) return 'en'
  return parts[1]
}

function formatDateForSitemap(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

async function generateSitemap(publicPath: string, pages: { path: string, lastmod: string, priority: number }[]) {
  const urls = pages.map(page => `<url>
  <loc>${page.path}</loc>
  <lastmod>${page.lastmod}</lastmod>
  <priority>${page.priority.toFixed(2)}</priority>
</url>\n`
  )
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
    http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

${urls}

</urlset>`
  await Bun.write(join(publicPath, 'sitemap.xml'), sitemapContent)
  console.log('Sitemap generated successfully.')
}

async function processDirectory(
  articlesPath: string,
  publicPath: string,
  indexes: Indexes,
  pages: { path: string, lastmod: string, priority: number }[],
  depth: number
) {
  const articlesLanguage = languageFromPath(articlesPath)
  indexes.push({
    path: articlesPath,
    links: [],
    language: articlesLanguage
  })
  const files = await readdir(articlesPath)

  for (const file of files) {
    const filePath = join(articlesPath, file)
    const fileStat = await stat(filePath)

    if (fileStat.isDirectory()) {
      await processDirectory(filePath, join(publicPath, file), indexes, pages, depth-0.1)
    } else if (file.endsWith('.md')) {
      const outputFileName = file.replace('.md', '.html')
      const outputFilePath = join(publicPath, outputFileName)
      const thisIndex = indexes.find(idx => idx.path === articlesPath)
      if (file !== 'index.md') {
        const pageAddress =
          articlesLanguage === 'en'
            ? `https://${process.env.ADDRESS}/${outputFileName}`
            : `https://${process.env.ADDRESS}/${articlesLanguage}/${outputFileName}`
        pages.push({ path: pageAddress, lastmod: formatDateForSitemap(fileStat.mtime), priority: Math.max(0.5, depth-0.2) });
        const text = await generatePage(
          pageAddress,
          filePath,
          outputFilePath,
          thisIndex.language
        )
        thisIndex.links.push({
          text: text,
          address: outputFileName
        })
      }
      else {
        const pageAddress =
          articlesLanguage === 'en'
            ? `https://${process.env.ADDRESS}/`
            : `https://${process.env.ADDRESS}/${articlesLanguage}/`
        pages.push({ path: pageAddress, lastmod: formatDateForSitemap(fileStat.mtime), priority: Math.max(0.5, depth) });
      }
    }


      
  }
}

async function generateSite() {
  const articlesPath = 'articles'
  const publicPath = 'public'
  const indexes: Indexes = []
  const pages: { path: string, lastmod: string, priority: number }[] = []

  try {
    await processDirectory(articlesPath, publicPath, indexes, pages, 1.0)
    await generateIndexes(publicPath, indexes)
    await generateSitemap(publicPath, pages)
  } catch (error) {
    console.error(`Error generating site: ${error}`)
  }
}

try {
  if (!(await dotEnv.exists())) throw new Error('No .env found')
} catch (error) {
  console.error(error)
}

await generateSite()

console.log('Static site generated successfully.')
