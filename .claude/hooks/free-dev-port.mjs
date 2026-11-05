// 開発サーバーを起動するコマンドの直前に、そのポートを使っているプロセスを止める
// （Claude Code の PreToolUse フック。設定は .claude/settings.json）。
//
// - バックエンド: ./gradlew bootRun        → backend/src/main/resources/application.properties の server.port
// - フロントエンド: npm run dev / npx vite → frontend/vite.config.ts の server.port
//
// 古いサーバーが残っていると、Vite は別のポートで起動し、Spring Boot は起動に失敗する。
// それを防ぎ、いつもアプリで決めたポートで動くようにする。
// Docker のプロセスは止めない（止めるとすべてのコンテナが落ちるため）。知らせるだけにする。
// このフックが失敗しても、コマンドは止めない（exit 0）。

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
const isWindows = process.platform === 'win32'

/** 設定ファイルから正規表現でポート番号を読む。読めなければ既定値。 */
function readPort(relativePath, pattern, fallback) {
  try {
    const match = readFileSync(join(projectDir, relativePath), 'utf8').match(pattern)
    return match ? Number(match[1]) : fallback
  } catch {
    return fallback
  }
}

/**
 * コマンドを、実際に実行する部分ごとに分ける。
 * 文字として渡しているだけの部分（ヒアドキュメントの本文、引用符の中身）は先に取り除く。
 * そうしないと、gh issue create の本文に起動コマンドの文字があるだけで、起動と見なしてしまう。
 */
export function commandSegments(command) {
  const code = command
    // ヒアドキュメントの本文（<<'EOF' ～ EOF、<<-EOF、<<"EOF" など）
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?(\n[ \t]*\2[ \t]*(?=\n|$)|$)/g, '\n')
    // PowerShell のヒアストリング（@' ～ '@、@" ～ "@）
    .replace(/@(['"])\r?\n[\s\S]*?\r?\n\1@/g, '')
    // 引用符の中身
    .replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""')
  return code
    .split(/&&|\|\||[;|&\n]/)
    .map((segment) =>
      segment
        .trim()
        // サブシェルの括弧と、先頭の環境変数の指定（FOO=bar）は飛ばす
        .replace(/^\(+\s*/, '')
        .replace(/^(\w+=\S*\s+)+/, ''),
    )
    .filter(Boolean)
}

/** コマンドから、起動するサーバーとそのポートを決める。部分の先頭にある起動コマンドだけを見る。 */
export function targetsOf(command) {
  const segments = commandSegments(command)
  const starts = (pattern) => segments.some((segment) => pattern.test(segment))
  const targets = []
  if (starts(/^(\S*[\\/])?gradlew(\.bat)?\s+(\S+\s+)*bootRun\b/)) {
    targets.push({
      name: 'バックエンド（Spring Boot）',
      port: readPort('backend/src/main/resources/application.properties', /^server\.port\s*=\s*(\d+)/m, 8080),
    })
  }
  if (starts(/^npm(\.cmd)?\s+run\s+dev\b/) || starts(/^npx(\.cmd)?\s+vite\b(?!\s+(build|preview)\b)/)) {
    targets.push({
      name: 'フロントエンド（Vite）',
      port: readPort('frontend/vite.config.ts', /server\s*:\s*\{[^}]*?\bport\s*:\s*(\d+)/s, 5173),
    })
  }
  return targets
}

/** ポートで待ち受けているプロセスの PID。 */
function listeningPids(port) {
  try {
    if (isWindows) {
      // -p tcp だと IPv4 しか出ない。Vite は IPv6（[::1]:5173）で待ち受けるので、全部を見る
      const out = execFileSync('netstat', ['-ano'], { encoding: 'utf8' })
      const pids = new Set()
      for (const line of out.split(/\r?\n/)) {
        const cols = line.trim().split(/\s+/)
        // 例: TCP  0.0.0.0:8080  0.0.0.0:0  LISTENING  1234 / TCP  [::1]:5173  [::]:0  LISTENING  5678
        if (cols[0] === 'TCP' && cols[3] === 'LISTENING' && cols[1].endsWith(`:${port}`)) {
          if (cols[4] !== '0') pids.add(cols[4])
        }
      }
      return [...pids]
    }
    const out = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' })
    return out.split(/\s+/).filter(Boolean)
  } catch {
    return [] // lsof は見つからないとき終了コード 1 になる
  }
}

function processName(pid) {
  try {
    if (isWindows) {
      const out = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { encoding: 'utf8' })
      return out.split(',')[0]?.replaceAll('"', '').trim() || '不明'
    }
    return execFileSync('ps', ['-p', pid, '-o', 'comm='], { encoding: 'utf8' }).trim() || '不明'
  } catch {
    return '不明'
  }
}

function kill(pid) {
  if (isWindows) {
    execFileSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'ignore' })
  } else {
    process.kill(Number(pid), 'SIGKILL')
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function main() {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
  const command = input.tool_input?.command ?? ''
  const messages = []

  for (const { name, port } of targetsOf(command)) {
    for (const pid of listeningPids(port)) {
      const pname = processName(pid)
      if (/docker|wslrelay|vpnkit/i.test(pname)) {
        messages.push(`ポート ${port} は Docker（${pname}, PID ${pid}）が使っているため止めませんでした。${name}は起動に失敗します。compose.yaml などのポート設定を確認してください。`)
        continue
      }
      try {
        kill(pid)
        messages.push(`${name}のポート ${port} を使っていたプロセス（${pname}, PID ${pid}）を止めました。`)
      } catch (e) {
        messages.push(`ポート ${port} のプロセス（${pname}, PID ${pid}）を止められませんでした: ${e.message}`)
      }
    }
    // ポートが空くまで少し待つ（最大5秒）
    for (let i = 0; i < 25 && listeningPids(port).length > 0; i++) sleep(200)
  }

  if (messages.length > 0) {
    const text = messages.join('\n')
    process.stdout.write(
      JSON.stringify({
        systemMessage: text,
        hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: text },
      }),
    )
  }
}

// テスト（free-dev-port.test.mjs）から読み込んだときは動かさない
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (e) {
    process.stderr.write(`free-dev-port: ${e.message}\n`)
  }
  process.exit(0)
}
