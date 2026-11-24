import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import fs from 'node:fs';
export default defineConfig(({mode}) => ({
  plugins: [...(mode === 'https' && !process.env.TLS_CERT ? [basicSsl()] : []), {name:'active-school-assets',closeBundle(){fs.mkdirSync('dist/models',{recursive:true});fs.cpSync('public/models/unified','dist/models/unified',{recursive:true});fs.cpSync('public/audio','dist/audio',{recursive:true});fs.mkdirSync('dist/models/explore',{recursive:true});for(const file of ['render.glb','collision.bin.gz','doors.json','navigation.json','elevator.json'])fs.copyFileSync('public/models/explore/'+file,'dist/models/explore/'+file);}}],
  server: {port:5173, strictPort:true, https: mode === 'https' && process.env.TLS_CERT ? {cert:fs.readFileSync(process.env.TLS_CERT),key:fs.readFileSync(process.env.TLS_KEY)} : undefined},
  build:{rollupOptions:{input:{explore:'index.html',legacy:'legacy.html'}},chunkSizeWarningLimit:650,copyPublicDir:false}
}));
