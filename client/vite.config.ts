import react from '@vitejs/plugin-react';
import sass from 'sass';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        implementation: sass,
        api: 'modern-compiler',
      },
    },
  },
});
