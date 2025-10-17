import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // CRITICAL FIX 1: Ensures assets are loaded relative to the current directory (fixes blank page)
  base: './', 
  
  root: '.', 
  
  // FIX 2: Added to handle the resolution of .jsx files
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.node'],
  },

  build: {
    outDir: 'dist', 
    rollupOptions: {
      input: {
        main: './index.html', 
      },
    },
  },
});
