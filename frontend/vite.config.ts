/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // いつも 5173 で起動する。使われているときは別のポートに逃げず、エラーで止める
    // （Claude Code では .claude/hooks/free-dev-port.mjs が先に古いプロセスを止める）
    port: 5173,
    strictPort: true,
    // 開発中は /api をバックエンド（./gradlew bootRun）へ転送する。
    // 本番は Spring Boot が画面と API を同じドメインから配信するので、
    // 開発中も同じ形にそろえ、CORS の設定をいらなくする
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    // ブラウザの代わりに jsdom で画面を組み立ててテストする
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
