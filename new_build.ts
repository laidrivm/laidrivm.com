try {
  const result = await Bun.build({
    entrypoints: ['./src/server.ts'],
    outdir: './out',
    taget: 'bun',
    format: 'esm',
    splitting: false,
    env: 'disable',
    sourcemap: 'linked',
    minify: true,
    packages: 'bundle'
  })
} catch (error) {
  console.error(error)
}
