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

async function generatePage(
  mdPath: string,
  outputPath: string,
  language: 'en' | 'ru' = 'en'
): string {
  try {
    const markdown = await Bun.file(mdPath).text()
    const contentHtml = xss(convertMarkdownToHtml(markdown), xssOptions)
    const title = extractTitle(markdown)
    const fullJsx = (
      <Page
        title={title}
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
      const linksJsx = <ArticleList links={index.links} />
      const fullJsx = (
        <Page
          title={title}
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

async function processDirectory(
  articlesPath: string,
  publicPath: string,
  indexes: Indexes
) {
  indexes.push({
    path: articlesPath,
    links: [],
    language: languageFromPath(articlesPath)
  })
  const files = await readdir(articlesPath)

  for (const file of files) {
    const filePath = join(articlesPath, file)
    const fileStat = await stat(filePath)

    if (fileStat.isDirectory()) {
      await processDirectory(filePath, join(publicPath, file), indexes)
    } else if (file.endsWith('.md') && file !== 'index.md') {
      const outputFileName = file.replace('.md', '.html')
      const outputFilePath = join(publicPath, outputFileName)
      const thisIndex = indexes.find(idx => idx.path === articlesPath)
      const text = await generatePage(
        filePath,
        outputFilePath,
        thisIndex.language
      )
      thisIndex.links.push({
        text: text,
        address: outputFileName
      })
    }
  }
}

async function generateSite() {
  const articlesPath = 'articles'
  const publicPath = 'public'

  try {
    const indexes: Indexes = []
    await processDirectory(articlesPath, publicPath, indexes)
    await generateIndexes(publicPath, indexes)
  } catch (error) {
    console.error(`Error generating site: ${error}`)
  }
}

await generateSite()

console.log('Static site generated successfully.')
