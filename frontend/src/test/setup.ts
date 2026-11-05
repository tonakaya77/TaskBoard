// toBeInTheDocument() などの画面向けの検証を使えるようにする
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom には <dialog> の showModal・close がないので、open 属性を付け外しするだけのものを用意する
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
}

// テストごとに描いた画面を片付ける
afterEach(() => {
  cleanup()
})
