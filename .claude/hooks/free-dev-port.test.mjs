// free-dev-port.mjs の、起動コマンドの判定のテスト。
// 実行: node --test .claude/hooks/

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { targetsOf } from './free-dev-port.mjs'

/** 判定したサーバーの名前（バックエンド / フロントエンド）だけを返す。 */
function namesOf(command) {
  return targetsOf(command).map(({ name }) => (name.startsWith('バックエンド') ? 'backend' : 'frontend'))
}

const NPM_DEV = ['npm', 'run', 'dev'].join(' ')
const BOOT_RUN = ['./gradlew', 'bootRun'].join(' ')

test('起動コマンドそのものは、起動と見なす', () => {
  assert.deepEqual(namesOf(NPM_DEV), ['frontend'])
  assert.deepEqual(namesOf(BOOT_RUN), ['backend'])
  assert.deepEqual(namesOf('npx vite'), ['frontend'])
  assert.deepEqual(namesOf('npm.cmd run dev'), ['frontend'])
  assert.deepEqual(namesOf('.\\gradlew.bat bootRun'), ['backend'])
  assert.deepEqual(namesOf('./gradlew -q bootRun'), ['backend'])
})

test('cd や環境変数のあとにある起動コマンドも、起動と見なす', () => {
  assert.deepEqual(namesOf(`cd frontend && ${NPM_DEV}`), ['frontend'])
  assert.deepEqual(namesOf(`cd backend; ${BOOT_RUN} > "$TEMP/log" 2>&1`), ['backend'])
  assert.deepEqual(namesOf(`(cd frontend && ${NPM_DEV})`), ['frontend'])
  assert.deepEqual(namesOf(`DEBUG=1 ${NPM_DEV}`), ['frontend'])
  assert.deepEqual(namesOf(`cd /d/RaiseTec/TaskBoard/frontend\n${NPM_DEV}`), ['frontend'])
})

test('vite build と vite preview は、開発サーバーの起動ではない', () => {
  assert.deepEqual(namesOf('npx vite build'), [])
  assert.deepEqual(namesOf('npx vite preview'), [])
})

test('引用符の中にある起動コマンドの文字は、起動と見なさない', () => {
  assert.deepEqual(namesOf(`gh issue create --body "確認: ${NPM_DEV} で画面を開く"`), [])
  assert.deepEqual(namesOf(`git commit -m '${BOOT_RUN} の説明'`), [])
  assert.deepEqual(namesOf(`echo "a" && gh pr create --body "${NPM_DEV}; ${BOOT_RUN}"`), [])
})

test('ヒアドキュメントの本文にある起動コマンドの文字は、起動と見なさない', () => {
  const heredoc = `gh pr create --body "$(cat <<'EOF'\n## 確認方法\n${NPM_DEV}\n${BOOT_RUN}\nEOF\n)"`
  assert.deepEqual(namesOf(heredoc), [])
  const heredocThenRun = `cat > note.md <<EOF\n${BOOT_RUN}\nEOF\n${NPM_DEV}`
  assert.deepEqual(namesOf(heredocThenRun), ['frontend'])
})

test('PowerShell のヒアストリングの本文にある起動コマンドの文字は、起動と見なさない', () => {
  const hereString = `git commit -m @'\n${NPM_DEV} の説明\n'@`
  assert.deepEqual(namesOf(hereString), [])
})

test('起動コマンドを含まないコマンドは、何もしない', () => {
  assert.deepEqual(namesOf('npm test'), [])
  assert.deepEqual(namesOf('npm run build && npm run lint'), [])
  assert.deepEqual(namesOf('./gradlew test'), [])
  assert.deepEqual(namesOf('grep -n bootRun backend/build.gradle'), [])
})
