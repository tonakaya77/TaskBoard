# TaskBoard
TaskBoard Project.

## バックエンド（`backend/`）

Java 25 / Spring Boot 4。Java 25 は Gradle が自動でダウンロードするので、PC に入れなくてよい。

```sh
cd backend
./gradlew bootRun
```

起動したら http://localhost:8080/api/health を開き、`{"status":"ok"}` が返れば動いている。

テストは `./gradlew test`。

いまはデータベースなしで起動する。データベースを使い始めたら、Docker Desktop が必要になる（`compose.yaml` の PostgreSQL を自動で起動する）。
