import {join} from 'path'

import {ok, err} from '../utils.ts'
import type {ServiceResponse} from '../types.ts'

export async function loadMetaVersion(): Promise<string | null> {
  try {
    const articlesDir = process.env['ARTICLES_DIR']
    if (!articlesDir) {
      console.error('ARTICLES_DIR environment variable is not set')
      return null
    }

    const metaPath = join(articlesDir, '.meta')
    const metaContentRaw = await Bun.file(metaPath).text()
    const metaContentJSON = JSON.parse(metaContentRaw)
    return metaContentJSON.version
  } catch (error) {
    console.error(`Error loading version from metafile: ${error}`)
    return null
  }
}

export async function createMetaFile(): Promise<ServiceResponse<Date>> {
  try {
    const articlesDir = process.env['ARTICLES_DIR']
    if (!articlesDir) {
      return err(new Error('ARTICLES_DIR environment variable is not set'))
    }

    const metaPath = join(articlesDir, '.meta')
    const builtAt = new Date()
    const meta = JSON.stringify({
      version: process.env['VERSION'],
      builtAt
    })
    await Bun.write(metaPath, meta)
    return ok(builtAt)
  } catch (error) {
    console.error(`Error creating metafile: ${error}`)
    return err(error as Error)
  }
}
