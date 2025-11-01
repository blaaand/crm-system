import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      exceljs: 'exceljs/dist/exceljs.min.js',
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // السماح بالوصول من أي IP
    strictPort: false,
    proxy: process.env.NODE_ENV === 'development' ? {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    } : undefined,
  },
})
