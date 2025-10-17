import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // FIX 1: Resolves the blank page/asset loading issue on Render
  base: './', 
  
  root: '.', 
  
  // FIX 2: Resolves .jsx extension failure
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.node'],
  },
  
  // FIX 3: Prevents conflicts by making Firebase dependencies external
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Treat firebase libraries as external, preventing bundling conflicts
      external: [
        'firebase/app', 
        'firebase/auth', 
        'firebase/firestore'
      ],
      input: {
        main: './index.html', 
      },
    },
  },
});
