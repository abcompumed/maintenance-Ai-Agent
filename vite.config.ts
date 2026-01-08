import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // هذا الجزء هو "المسكن" الذي سيمنع الخطأ في Vercel
  define: {
    'import.meta.env.VITE_ANALYTICS_ENDPOINT': JSON.stringify(''),
    'import.meta.env.VITE_ANALYTICS_WEBSITE_ID': JSON.stringify(''),
  },
  build: {
    outDir: 'dist',
  }
});
