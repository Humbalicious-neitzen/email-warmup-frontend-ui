import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 1. Ensures Vite starts looking in the current directory (the root)
  root: '.', 
  
  // 2. CRITICAL FIX: Tells Vite where to find files with the .jsx extension
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.node'],
  },

  build: {
    outDir: 'dist', 
    rollupOptions: {
      input: {
        // Defines the HTML entry point
        main: './index.html', 
      },
    },
  },
  base: '/',
});
