import {join} from 'path'

import {ok, err} from '../utils.ts'
import type {ServiceResponse} from '../types.ts'

const metaPath = join(process.env['ARTICLES_DIR'], '.meta')

export async function loadMetaVersion(): Promise<string | null> {
  try {
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
    const builtAt = new Date()
    const meta = JSON.stringify({
      version: process.env['VERSION'],
      builtAt
    })
    await Bun.write(metaPath, meta)
    return ok(builtAt)
  } catch (error) {
    console.error(`Error creating metafile: ${error}`)
    return err(error)
  }
}
