import esbuild from 'esbuild'
import cssModulesPlugin from 'esbuild-css-modules-plugin'
import path from 'path'
import fs from 'fs'

// Create a plugin to handle Prism.js components properly
const prismPlugin = {
  name: 'prism-resolver',
  setup(build) {
    build.onResolve({ filter: /^prismjs\/components\/prism-/ }, args => {
      const componentPath = path.resolve(
        path.join(process.cwd(), 'node_modules', args.path + '.min.js')
      );
      
      if (fs.existsSync(componentPath)) {
        return { path: componentPath };
      }
      return { 
        contents: 'export default {}',
        loader: 'js'
      };
    });
  }
};

esbuild.build({
  entryPoints: ['./src/index.ts', './src/generate.tsx'],
  bundle: true,
  metafile: true,
  outdir: './out',
  outbase: 'src',
  platform: 'node',
  format: 'esm',
  target: 'esnext',
  external: [],
  plugins: [
    cssModulesPlugin({
      inject: true,
      minify: true,
      targets: '>= 0.25%',
    }),
  ],
  nodePaths: ['node_modules'],
}).catch(() => process.exit(1));
