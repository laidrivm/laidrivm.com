import path from 'path'
import {mkdir} from 'node:fs/promises'

import esbuild from 'esbuild'
import cssModulesPlugin from 'esbuild-css-modules-plugin'

import * as EnvUtils from './src/envutils.ts'

esbuild
  .build({
    entryPoints: ['./src/index.ts', './src/generate.tsx'],
    bundle: true,
    metafile: true,
    outdir: './out',
    outbase: 'src',
    platform: 'node',
    format: 'esm',
    target: 'esnext',
    external: [],
    nodePaths: ['node_modules']
  })
  .catch(() => process.exit(1))

EnvUtils.initDefaults()

const pub = Bun.file(process.env.PUBLIC)

if (!(await pub.exists())) {
  await mkdir(process.env.PUBLIC, {recursive: true})
}

const fonts = Bun.file(path.join(process.env.PUBLIC, 'fonts'))
if (!(await fonts.exists('./public/fonts'))) {
  await mkdir(path.join(process.env.PUBLIC, 'fonts'), {recursive: true})
}

esbuild
  .build({
    entryPoints: ['./src/styles/main.css'],
    bundle: true,
    outfile: './public/main.css',
    minify: true,
    metafile: true,
    loader: {
      '.ttf.woff2': 'file',
      '.woff2': 'file'
    },
    plugins: [
      cssModulesPlugin({
        inject: true,
        minify: true,
        targets: '>= 0.25%'
      })
    ],
    publicPath: '/', // Set public path for file references
    assetNames: 'fonts/[name]' // Output assets to the fonts directory
  })
  .catch(() => process.exit(1))
