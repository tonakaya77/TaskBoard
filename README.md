# TaskBoard

タスクの進み具合と期限をひと目で確認できる、Trello 風のタスク管理 Web アプリ。RaiseTech の課題として、要件定義から設計・実装までを一通り行う。

## 主な機能

1人のユーザーが、複数のプロジェクトでタスクの進み具合と期限を管理する。

- ログイン・ログアウト（アカウントは初期データで用意する）
- プロジェクトとステータス（ボードの列）の管理
- タスクとサブタスクの管理。ドラッグ＆ドロップでの移動と並び替え
- サブタスクの進み具合の表示（カードに「完了した数 / 全体の数」を出す）
- 期限アラート（期限が近いタスクは黄色、当日と期限超過は赤）
- 緊急度の表示（高は赤、中は黄。カードの左端の色帯とバッジで示す）
- ダッシュボード（今日やるタスクと、期限が近い順のタスク一覧）
- カレンダー（期限の日にタスクを表示する）

詳しくは [機能設計](docs/functions.md) を参照。

### 今できること

開発の途中。いまは次のところまで動く。

- ボード画面（`/projects/{id}/board`）に、ステータスの列とタスクのカードを表示する。カードには期限と緊急度を出す
- タスクとステータスを読み取る API（下の「API」を参照）
- データベースのテーブル（ユーザー・プロジェクト・ステータス・タスク・サブタスク）と、開発用のテストデータ

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React 19 / TypeScript 6 / Vite 8 / React Router 8 / TanStack Query 5 / CSS Modules |
| バックエンド | Java 25 / Spring Boot 4.1 / MyBatis / Flyway / Gradle 9 |
| データベース | PostgreSQL 18（手元では Docker Compose で動かす） |
| テスト | JUnit 6 / Testcontainers（バックエンド）、Vitest / React Testing Library（フロントエンド） |

細かいバージョンと選んだ理由は [技術スタック](docs/tech-stack.md) を参照。

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [要件定義書](docs/requirements.md) | 背景・目的、機能要件・非機能要件の概要、制約事項 |
| [機能設計](docs/functions.md) | 機能一覧、機能詳細、ユースケース |
| [画面設計](docs/screens.md) | 画面一覧、ワイヤーフレーム、画面遷移図、画面要件 |
| [データベース設計](docs/database.md) | ER図、テーブル定義、インデックス、制約 |
| [技術スタック](docs/tech-stack.md) | 使う技術とバージョン、選んだ理由 |
| [画面モック](mock/index.html) | HTML・CSS・JavaScript で作った画面の見本。`mock/index.html` をブラウザで開くと見られる |

## フォルダ構成

```
TaskBoard/
├── backend/    バックエンド（Spring Boot）。DB のマイグレーションは src/main/resources/db/migration/
├── frontend/   フロントエンド（React ＋ Vite）
├── docs/       要件定義・設計のドキュメント
├── mock/       画面モック
├── .github/    イシューと PR のテンプレート
└── .claude/    Claude Code の設定とフック
```

## 必要なもの

| ソフト | 用途 |
|---|---|
| Docker Desktop | PostgreSQL を動かす。バックエンドを起動する前に立ち上げておく |
| Node.js 26 以上 | フロントエンドの開発とビルド |

Java 25 は Gradle が自動でダウンロードするので、PC に入れなくてよい。

## 起動の手順

ターミナルを2つ開き、バックエンド → フロントエンドの順に起動する。

```sh
# 1つ目のターミナル
cd backend
./gradlew bootRun

# 2つ目のターミナル
cd frontend
npm install    # 初回だけ
npm run dev
```

http://localhost:5173 を開くと、ボード画面が出る。ポートはバックエンドが 8080、フロントエンドが 5173 に決めてある。それぞれの詳しい説明は下に書く。

## バックエンド（`backend/`）

PostgreSQL は Docker で動かすので、Docker Desktop を起動しておく。

```sh
cd backend
./gradlew bootRun   # PostgreSQL（compose.yaml）も自動で起動する
```

起動したら http://localhost:8080/api/health を開き、`"status":"ok"` と PostgreSQL のバージョン（`"database":"PostgreSQL 18..."`）が返れば、アプリとデータベースの両方が動いている。

`./gradlew bootRun` では dev プロファイルが有効になり、開発用のテストデータ（モックと同じ内容。ユーザー1人・プロジェクト2つ・タスク6つ）が入る。入れ直したいときは `docker compose down -v` でデータベースを消してから起動する。

### API

| メソッド | パス | 内容 |
|---|---|---|
| GET | `/api/tasks` | 全タスク（ID 順） |
| GET | `/api/tasks/{id}` | タスク1件。ないときは 404 |
| GET | `/api/tasks/status/{statusId}` | ステータス別のタスク（カンバンの列表示用）。列の中の並び順 |
| GET | `/api/projects/{projectId}/statuses` | プロジェクトのステータス（ボードの列）。並び順。プロジェクトがないときは空の配列 |

```sh
curl http://localhost:8080/api/tasks
curl http://localhost:8080/api/tasks/1
curl http://localhost:8080/api/tasks/status/1
curl http://localhost:8080/api/projects/1/statuses
```

アプリを止めても PostgreSQL は動いたまま。止めるときは `docker compose down`（データは残る）。

テストは `./gradlew test`（テスト用の PostgreSQL を Testcontainers で別に起動する）。
`./gradlew check` は、テストに加えて Checkstyle（書き方のチェック。ルールは `config/checkstyle/checkstyle.xml`）とコンパイラの警告のチェックもまとめて実行する。

### データベースの接続先

| 項目 | 値 |
|---|---|
| ホスト / ポート | `localhost:5434`（5432・5433 はほかのプロジェクトと重ならないように避けた） |
| データベース名 | `taskboard` |
| ユーザー / パスワード | `taskboard` / `taskboard` |

データベースのツールからも、この値でつなげる。アプリの接続先は環境変数 `DB_URL`・`DB_USERNAME`・`DB_PASSWORD` で変えられる。

## フロントエンド（`frontend/`）

```sh
cd frontend
npm install    # 初回と、package.json が変わったとき
npm run dev    # http://localhost:5173 で開く
```

画面は API を使うので、先にバックエンド（`./gradlew bootRun`）を起動しておく。開発中は `/api` へのリクエストを Vite が http://localhost:8080 へ転送する（`vite.config.ts`）。

| コマンド | 内容 |
|---|---|
| `npm test` | テスト（Vitest ＋ React Testing Library） |
| `npm run lint` | ESLint でチェック |
| `npm run format` | Prettier で整形（`npm run format:check` は確かめるだけ） |
| `npm run build` | 型チェックとビルド（`dist/` に出る） |

## 開発の進め方

イシュー → ブランチ → コミット → PR → マージの流れで進める。main への直接のコミット・プッシュはしない（ブランチ保護で禁止している）。

- ブランチ名: `種類/イシュー番号-短い説明`（例: `feature/12-add-login`）
- コミットメッセージ: Conventional Commits の形で日本語（例: `feat: タスク一覧APIを追加 (#12)`）
- PR: テンプレートの項目に沿って書き、`Closes #番号` でイシューを閉じる

### PR の前のチェック

CI はまだないので、PR を作る前に手元で次のチェックを実行し、すべて通ることを確かめる。

| 場所 | コマンド | 内容 |
|---|---|---|
| `backend/` | `./gradlew check` | Checkstyle・コンパイラの警告・テスト（Docker Desktop が必要） |
| `frontend/` | `npm run lint` | ESLint |
| `frontend/` | `npm run format:check` | Prettier の整形（直すときは `npm run format`） |
| `frontend/` | `npm test` | テスト |
| `frontend/` | `npm run build` | 型チェックとビルド |
| 一番上 | `node --test .claude/hooks/` | Claude Code のフックのテスト |

Claude Code では `/check` で、変えた部分のチェックをまとめて実行できる（`.claude/skills/check/SKILL.md`）。

細かいルールは [CLAUDE.md](CLAUDE.md) を参照。
