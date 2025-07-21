import { mkdir } from 'node:fs/promises'
import { join, relative } from 'path'
import { readdir, cp } from 'node:fs/promises'

const PUBLIC_DIR = process.env.PUBLIC ?? './public'

await Bun.build({
  entrypoints: ['./src/server.ts'],
  outdir: './out',
  target: 'bun',
  format: 'esm',
  env: 'disable',
  splitting: false,
  minify: false,
  external: ['node:crypto', 'universal-github-app-jwt'],
  sourcemap: 'linked',
  packages: 'bundle'
})

await Bun.build({
  entrypoints: ['./src/styles/main.css'],
  outdir: './public',
  minify: true,
  target: 'browser'
})

const srcScriptsDir = './src/components/scripts'
const publicScriptsDir = join(PUBLIC_DIR, 'scripts')

await mkdir(publicScriptsDir, { recursive: true })

async function moveScripts(dir: string, out: string) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const from = join(dir, entry.name)
    const to = join(out, entry.name)

    if (entry.isDirectory()) {
      await mkdir(to, { recursive: true })
      await moveScripts(from, to)
    } else {
      await cp(from, to)
    }
  }
}

await moveScripts(srcScriptsDir, publicScriptsDir)
