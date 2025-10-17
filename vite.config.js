import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This file tells Vite how to build and where to find the source code.
export default defineConfig({
  plugins: [react()],
  // Ensures all paths are relative to the final deployment root.
  base: '/',
  build: {
    // CRITICAL: Tells Vite to put the final files in the 'dist' folder.
    outDir: 'dist',
  }
});
