import {defineConfig} from 'vite';
import schoolConfig from './vite.config.js';

export default defineConfig(environment => {
  const config = schoolConfig(environment);
  config.build.rollupOptions.input.fireEscape = 'fire-escape.html';
  return config;
});
