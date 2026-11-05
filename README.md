# TaskBoard
TaskBoard Project.

## バックエンド（`backend/`）

Java 25 / Spring Boot 4 / PostgreSQL 18。Java 25 は Gradle が自動でダウンロードするので、PC に入れなくてよい。PostgreSQL は Docker で動かすので、Docker Desktop を起動しておく。

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

### データベースの接続先

| 項目 | 値 |
|---|---|
| ホスト / ポート | `localhost:5434`（5432・5433 はほかのプロジェクトと重ならないように避けた） |
| データベース名 | `taskboard` |
| ユーザー / パスワード | `taskboard` / `taskboard` |

データベースのツールからも、この値でつなげる。アプリの接続先は環境変数 `DB_URL`・`DB_USERNAME`・`DB_PASSWORD` で変えられる。

## フロントエンド（`frontend/`）

React 19（TypeScript）/ Vite。Node.js 24 以上を入れておく。

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
