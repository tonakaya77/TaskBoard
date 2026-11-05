# TaskBoard 技術スタック

[要件定義書](requirements.md) の技術選定に関する詳細をまとめる。

言語とフレームワークは、バックエンドが Java / Spring Boot、フロントエンドが React（Next.js は使わない）。データベースは PostgreSQL を仮決定とし、最終決定はあとで行う。それ以外のツールは、これらに合わせて選んだ。

状態は、次の意味で使う。

| 状態 | 意味 |
|---|---|
| 決定 | 選定を決め、プロジェクトに入れてある |
| 採用 | プロジェクトに入れて使っている |
| 採用予定 | 使うことは決めたが、まだ入れていない（機能を作るときに入れる） |
| 仮決定 / 候補 | まだ最終決定していない |

バージョンは、プロジェクトに入れて実際に使っているもの（バックエンドは `backend/build.gradle` と、Spring Boot が管理するバージョン、フロントエンドは `frontend/package-lock.json`）を書く。まだ入れていないものは「—」にし、入れたときに書く。バージョンを上げたときは、この表も直す。

## 1. バックエンド

| 分類 | 選定 | バージョン | 状態 | 理由 |
|---|---|---|---|---|
| 言語 / フレームワーク | Java / Spring Boot | Java 25 / Spring Boot 4.1.2（Spring Framework 7.0.10） | 決定 | Java / Spring Boot は RaiseTech の課題の指定。Spring Boot は 3 系の無償サポートが終わり、Spring Initializr でも 4 系しか選べないため 4 系にした。Java 25 は最新の長期サポート版 |
| ビルドツール | Gradle | 9.8.2（Gradle Wrapper） | 採用 | Spring Initializr の初期値で、設定ファイルが短く済む |
| 認証 | Spring Security（セッション＋Cookie） | — | 採用予定 | 「最後の操作から7日間操作がなければログアウト」（[機能設計](functions.md) F-01）は、操作のたびに期限が延びるセッションの仕組みでそのまま作れる |
| セッションの保存先 | Spring Session JDBC | — | 採用予定 | セッションをデータベースに保存し、サーバーを再起動してもログインが切れないようにする |
| O/Rマッパー | MyBatis | MyBatis 3.5.19（MyBatis Spring Boot Starter 4.1.0） | 採用 | SQL を自分で書くので、データベースの理解が深まる |
| マイグレーション | Flyway | 12.4.0 | 採用 | テーブル定義を SQL ファイルで履歴として残せる。SQL を自分で書く方針に合う |
| 入力チェック | Bean Validation | Hibernate Validator 9.1.5 | 採用 | 文字数の上限などを、項目ごとに宣言して書ける |
| テスト | JUnit / Spring Boot Test / Testcontainers | JUnit 6.0.3 / Spring Boot Test 4.1.2 / Testcontainers 2.0.5 | 採用 | 本番と同じデータベースで、複合外部キーなどの制約まで確かめられる。JUnit は Spring Boot 4 の標準に合わせて 6 系になった |

## 2. フロントエンド

| 分類 | 選定 | バージョン | 状態 | 理由 |
|---|---|---|---|---|
| 言語 / ライブラリ | React（TypeScript） | React 19.3.1 / TypeScript 6.0.3 | 決定 | ドラッグ＆ドロップの多い画面が作りやすい。React の経験が活かせる |
| 実行環境 | Node.js | 26 以上 | 採用 | 開発とビルドに使う。26 は長期サポート版 |
| ビルドツール | Vite | 8.3.6 | 採用 | Next.js を使わない React の開発環境を手早く用意できる |
| 画面の切り替え | React Router | 8.5.1 | 採用 | URL ごとに画面を出し分ける |
| サーバーとのやり取り | TanStack Query | 5.106.1 | 採用 | ドラッグしたあとすぐ画面に反映し、保存に失敗したら元に戻す処理が書きやすい |
| ドラッグ＆ドロップ | @hello-pangea/dnd | 18.0.1 | 採用 | 使う場所（ボードのカード、今日やるタスク、サブタスク、ステータス）はすべて縦のリストで、これで足りる。team-task-manager で使った経験がある |
| カレンダー | 自分で作る（date-fns） | — | 採用予定 | スマホの色の印、日付の下の一覧、今日と選択中の丸など、独自の表示が多い。ライブラリ（FullCalendar）を細かく変えるより、自分で作るほうが早い |
| 日付・タイムゾーン | date-fns ＋ @date-fns/tz | — | 採用予定 | 日本時間で、朝4時に切り替わる「今日」を計算する |
| スタイル | CSS Modules | （Vite に組み込み） | 採用 | モックの CSS をほぼそのまま移せる |
| テスト | Vitest ＋ React Testing Library | Vitest 5.1.0 / React Testing Library 16.3.3 | 採用 | Vite と組み合わせて使える |
| コードの整形・チェック | ESLint ＋ Prettier | ESLint 10.14.0 / Prettier 3.9.10 | 採用 | 書き方をそろえ、よくある間違いを見つける |

## 3. データベース・環境・公開

| 分類 | 選定 | バージョン | 状態 | 理由 |
|---|---|---|---|---|
| データベース | PostgreSQL | 18 | 仮決定（あとで最終決定） | 設計はひとまず PostgreSQL に合わせる。AWS の RDS でも使える |
| 手元の開発環境 | Docker Compose | （Docker Desktop に付属） | 採用 | データベースを手元のパソコンに直接入れなくて済む |
| 公開先 | AWS（EC2 ＋ RDS） | — | 候補 | 課題の公開先として一般的で、インフラの経験も積める |
| 配信の形 | React をビルドして Spring Boot に同梱する | — | 採用予定 | 画面と API を同じドメインから配信するので、CORS と Cookie の設定がいらない |
