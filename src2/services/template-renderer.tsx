import {join, dirname} from 'path'
import {mkdir} from 'node:fs/promises'

import {PageTemplate} from '../components/PageTemplate.tsx'
import {ArticlesFeed} from '../components/ArticlesFeed.tsx'
import {ok, isIndex} from '../utils.ts'
import type {ServiceResponse, FileCollection} from '../types.ts'

let wasPrintedOnce = false

function getUrl(sourcePath: string): string {
  return `https://${process.env.BASE_URL}/${sourcePath.replace('.md', '').replace('index', '')}`
}

function getOutputPath(sourcePath: string): string {
  return join(process.env.PUBLIC_DIR, sourcePath.replace('.md', '.html'))
}

export async function renderPages(
  converterContent: ServiceResponse<FileCollection>
): Promise<ServiceResponse<FileCollection>> {
  if (!converterContent.success) {
    return converterContent
  }
  if (converterContent.data.mode === 'skip') {
    console.log(`Skipping rendering JSX into HTML`)
    return ok({
      mode: 'skip'
    })
  }
  const files = converterContent.data.files
  const processedFiles = []
  for (const file of files) {
    if (file.type === 'html') {
      const outputPath = getOutputPath(file.sourcePath)
      console.log(`Rendering page ${outputPath}`)

      const page = (
        <PageTemplate
          lang={file.pageTemplateProps.lang}
          title={file.pageTemplateProps.title}
          description={file.pageTemplateProps.description}
          image={file.pageTemplateProps.image}
          updatedAt={file.lastModified}
          url={getUrl(file.sourcePath)}
          includeArrow={!isIndex(file.sourcePath)}
        >
          {file.content}
          {isIndex(file.sourcePath) && (
            <ArticlesFeed
              lang={file.pageTemplateProps.lang}
              links={file.articleLinks}
            />
          )}
        </PageTemplate>
      )

      processedFiles.push({
        ...file,
        outputPath,
        content: page
      })

      await mkdir(dirname(outputPath), {recursive: true})
      await Bun.write(outputPath, page)

      if (!wasPrintedOnce) {
        wasPrintedOnce = true
        console.log(page)
      }
    } else {
      processedFiles.push(file)
    }
  }

  return ok({
    ...converterContent.data,
    files: processedFiles
  })
}
