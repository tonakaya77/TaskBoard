/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // ブラウザの代わりに jsdom で画面を組み立ててテストする
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
