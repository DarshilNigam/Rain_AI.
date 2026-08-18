import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      ignored: [
        '**/*.pptx',
        '**/*.ppt',
        '**/*.pdf',
        '**/*.docx',
        '**/*.xlsx',
        '**/*.tmp',
        '**/~$*',
        '**/scratch/**',
        '**/slides_preview/**',
      ],
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
});
