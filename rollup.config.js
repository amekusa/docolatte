import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'static/scripts/src/main.js',
  output: {
    name: 'docolatte',
    dir: 'static/scripts',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    resolve(),
    commonjs()
  ]
};
