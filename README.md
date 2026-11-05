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

```sh
curl http://localhost:8080/api/tasks
curl http://localhost:8080/api/tasks/1
curl http://localhost:8080/api/tasks/status/1
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
