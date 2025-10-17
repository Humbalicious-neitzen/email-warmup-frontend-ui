import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // FINAL FIX: This tells Vite to load all assets relative to the current folder, 
  // which resolves the blank page (404 for JS files) error on Render.
  base: './', 
  
  root: '.', 
  
  // Ensures the compiler can find .jsx files
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
