# TaskBoard
TaskBoard Project.

## バックエンド（`backend/`）

Java 25 / Spring Boot 4。必要なのは Docker Desktop だけ（Java 25 は Gradle が自動でダウンロードする）。

```sh
cd backend
./gradlew bootRun   # PostgreSQL（compose.yaml）も自動で起動する
```

起動したら http://localhost:8080/api/health を開き、`"status":"ok"` が返れば動いている。

テストは `./gradlew test`（テスト用の PostgreSQL を Docker で起動する）。
