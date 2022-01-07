import replace from '@rollup/plugin-replace';
import typescript from 'rollup-plugin-typescript';
import {terser} from 'rollup-plugin-terser';
import babel from '@rollup/plugin-babel';
import copy from 'rollup-plugin-copy'

const typescriptPlugin = typescript();

const MINIFY = process.env.NODE_ENV !== 'development';


export default [
  {
    input: './src/browser.ts',
    plugins: [
      typescriptPlugin,
      [],
      MINIFY && terser({
        output: {comments: false},
      }),
    ],
    output: {
      file: `dist/web/lib.js`,
      format: 'iife',
      sourcemap: false,
    },
  },
  {
    input: `src/usermaven.ts`,
    plugins: [
      typescriptPlugin,
      replace({
        __buildEnv__: process.env.NODE_ENV || 'production',
        __buildDate__: () => new Date().toISOString(),
        __buildVersion__:  process.env['npm_package_version']
      }),
      copy({
        targets: [
          {src: 'src/interface.d.ts', dest: 'dist/npm', rename: 'usermaven.d.ts'}
        ]
      })
    ],
    output: [
      {file: 'dist/npm/usermaven.es.js', format: 'es'},
      {file: 'dist/npm/usermaven.cjs.js', format: 'cjs'},
    ]
  }
];
