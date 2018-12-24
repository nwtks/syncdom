import buble from 'rollup-plugin-buble';
import { uglify } from 'rollup-plugin-uglify';

export default [
  {
    input: 'src/syncdom.js',
    output: {
      file: 'dist/syncdom.js',
      format: 'cjs'
    },
    plugins: [buble()]
  },
  {
    input: 'src/syncdom.js',
    output: {
      name: 'syncdom',
      file: 'dist/syncdom.min.js',
      format: 'umd'
    },
    plugins: [buble(), uglify()]
  }
];
