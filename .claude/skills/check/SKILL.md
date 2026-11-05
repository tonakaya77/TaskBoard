---
name: check
description: PR を作る前のチェック（バックエンドの ./gradlew check、フロントエンドの lint・整形・テスト・ビルド、フックのテスト）をまとめて実行し、結果を表で報告する。「チェックして」「PR の前に確認して」「/check」と言われたとき、または PR を作る前に必ず使う。
---

# PR の前のチェック

PR を作る前に、変えた部分のチェックをすべて実行する。CI がないので、ここで通らなければ PR を作らない。

## 1. どこを変えたかを調べる

```sh
git diff --name-only main...HEAD
git status --short
```

コミット済みの変更と、まだコミットしていない変更の両方を見る。

| 変えたファイル | 実行するチェック |
|---|---|
| `backend/` の下 | バックエンド |
| `frontend/` の下 | フロントエンド |
| `.claude/hooks/` の下 | フック |
| それ以外だけ（docs・README など） | チェックなし（そう報告する） |

引数に `all` を渡されたとき（`/check all`）は、変えた場所に関係なくすべて実行する。

## 2. チェックを実行する

### バックエンド（`backend/` で実行）

```sh
./gradlew check
```

Checkstyle（ルールは `config/checkstyle/checkstyle.xml`）、コンパイラの警告（警告があれば失敗）、テストをまとめて実行する。
テストは Testcontainers で PostgreSQL を起動するので、Docker Desktop が動いている必要がある。動いていなければ、ユーザーに起動を頼む。

### フロントエンド（`frontend/` で実行）

```sh
npm run lint
npm run format:check
npm test
npm run build
```

`npm run build` で型チェックも行う（`tsc -b`）。

### フック（リポジトリの一番上で実行）

```sh
node --test .claude/hooks/
```

## 3. 失敗したとき

- 整形（`format:check`）だけの失敗は、`npm run format` で直してから、もう一度チェックする
- それ以外は、原因を調べて直す。直した内容は報告に書く
- 今回の変更と関係なさそうな失敗（もともと落ちていたテストなど）は、勝手に直さずユーザーに知らせる

## 4. 報告する

最後に、結果を表でまとめる。実行しなかったものは、その理由を書く。

| チェック | 結果 |
|---|---|
| バックエンド `./gradlew check` | 成功 / 失敗（理由） / 実行せず（理由） |
| フロントエンド lint | … |
| フロントエンド 整形 | … |
| フロントエンド テスト | …（件数） |
| フロントエンド ビルド | … |
| フック テスト | … |

すべて成功したときだけ、PR を作ってよい。
