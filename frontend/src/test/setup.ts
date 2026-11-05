// toBeInTheDocument() などの画面向けの検証を使えるようにする
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// テストごとに描いた画面を片付ける
afterEach(() => {
  cleanup()
})
