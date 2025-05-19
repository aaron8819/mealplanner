import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: '.', // ensure root is correct
  plugins: [react()],
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, './index.html'),
    },
    outDir: 'dist'
  },
  publicDir: 'public',
});
