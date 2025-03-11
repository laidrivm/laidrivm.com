import {existsSync, statSync, rmdirSync} from 'node:fs'
import {readdir} from 'node:fs/promises'
import path from 'path'

const EXCEPTIONS = [
  'favicon.png',
  'mellon-for-incubators.pdf',
  'og_image-min.jpg',
  'robots.txt'
]

async function deleteRecursively(dirPath: string) {
  if (!existsSync(dirPath)) return

  const items = await readdir(dirPath)

  for (const item of items) {
    const itemPath = path.join(dirPath, item)
    const isDirectory = statSync(itemPath).isDirectory()

    if (isDirectory) {
      await deleteRecursively(itemPath)

      try {
        rmdirSync(itemPath)
        console.log(`Deleted directory: ${itemPath}`)
      } catch (err) {
        console.error(`Failed to delete directory ${itemPath}: ${err}`)
      }
    } else {
      if (dirPath === process.env.PUBLIC && EXCEPTIONS.includes(item)) {
        console.log(`Keeping excepted file: ${item}`)
        continue
      }

      try {
        const file = Bun.file(itemPath)
        await file.delete()
        console.log(`Deleted file: ${itemPath}`)
      } catch (err) {
        console.error(`Failed to delete file ${itemPath}: ${err}`)
      }
    }
  }
}

async function cleanupPublicDirectory() {
  const publicDir = process.env.PUBLIC

  if (!publicDir) {
    console.error('PUBLIC environment variable is not set')
    process.exit(1)
  }

  if (!existsSync(publicDir)) {
    console.error(`Directory does not exist: ${publicDir}`)
    process.exit(1)
  }

  console.log(`Starting cleanup of ${publicDir}`)
  console.log(`Preserving the following files: ${EXCEPTIONS.join(', ')}`)

  await deleteRecursively(publicDir)
  console.log('Public directory cleanup completed')
}

cleanupPublicDirectory().catch(err => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
