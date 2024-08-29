import esbuild from 'esbuild';
import cssModulesPlugin from 'esbuild-css-modules-plugin';

esbuild.build({
  entryPoints: ['./src/index.ts', './src/generate.tsx'],
  bundle: true,
  metafile: true,
  outdir: './out',
  platform: 'node',
  format: 'esm',
  target: 'esnext',
  plugins: [
    cssModulesPlugin({
      inject: true,
      minify: true,
      targets: '>= 0.25%',
    }),
  ],
}).catch(() => process.exit(1));
