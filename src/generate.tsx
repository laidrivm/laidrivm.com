import {readdir} from 'node:fs/promises'

import {renderToString} from 'preact-render-to-string'
import {marked} from 'marked'
import xss from 'xss'

import Page from './components/page.tsx'
import Heading from './components/heading.tsx'
import ArticleList from './components/articlelist.tsx'

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

async function generatePage(mdPath: string, outputPath: string) {
	try {
		const markdown = await Bun.file(mdPath).text()
		const contentHtml = xss(convertMarkdownToHtml(markdown))
		const title = extractTitle(markdown)
		const fullJsx = (
			<Page title={title} content={contentHtml} includeArrow={true} />
		)
		const html = '<!DOCTYPE html>\n' + renderToString(fullJsx)
		await Bun.write(outputPath, html)
		console.log(`Static page generated successfully at ${outputPath}`)
	} catch (error) {
		console.error(`Error generating HTML from Markdown: ${error}`)
	}
}

async function gereateIndex(
	articlesPath: string,
	publicPath: string,
	links: string[]
) {
	try {
		const mdPath = `${articlesPath}/index.md`
		const markdown = await Bun.file(mdPath).text()
		const contentHtml = xss(convertMarkdownToHtml(markdown))
		const title = extractTitle(markdown)
		const linksJsx = <ArticleList links={links} />
		const fullJsx = (
			<Page
				title={title}
				content={`${contentHtml}${renderToString(linksJsx)}`}
			/>
		)
		const html = '<!DOCTYPE html>\n' + renderToString(fullJsx)
		await Bun.write(`${publicPath}/index.html`, html)
		console.log('Index page generated successfully.')
	} catch (error) {
		console.error(`Error generating HTML from Markdown: ${error}`)
	}
}

async function generateSite() {
	const articlesPath = './articles'
	const publicPath = './public'
	const links: string[] = []

	try {
		const files = await readdir(articlesPath)
		const mdFiles = files.filter(file => file.endsWith('.md'))

		for (const mdFile of mdFiles) {
			if (mdFile === 'index.md') continue
			const mdFilePath = `${articlesPath}/${mdFile}`
			const outputFileName = mdFile.replace('.md', '.html')
			const outputFilePath = `${publicPath}/${outputFileName}`
			await generatePage(mdFilePath, outputFilePath)
			links.push(outputFileName)
		}

		await gereateIndex(articlesPath, publicPath, links)
	} catch (error) {
		console.error(`Error reading articles directory: ${error}`)
	}
}

await generateSite()

console.log('Static site generated successfully.')
