# TaskBoard 技術スタック候補

[要件定義書](requirements.md) の技術選定に関する詳細をまとめる。

技術は、要件が確定してから決める。下の表は、現時点の候補である。

| 分類 | 候補 | 状態 | 理由 |
|---|---|---|---|
| バックエンド | Java / Spring Boot | 講座の指定 | RaiseTech の課題の指定 |
| フロントエンド | React（TypeScript） | 採用予定 | ドラッグ＆ドロップの多い画面が作りやすい。React の経験が活かせる |
| 画面とサーバーのつなぎ方 | Spring Boot の REST API | 候補 | React と組み合わせるため |
| ビルドツール | Vite | 候補 | React の開発環境を手早く用意できる |
| データベース | MySQL | 候補 | Spring Boot と組み合わせる例が多く、AWS の RDS でも使える |
| O/Rマッパー | MyBatis | 候補 | SQL を自分で書くので、データベースの理解が深まる |
| ドラッグ＆ドロップ | @hello-pangea/dnd | 候補 | team-task-manager で使った経験がある |
| カレンダー | FullCalendar | 候補 | 月表示のカレンダーを少ない実装で作れる |
| 公開先 | AWS（EC2 ＋ RDS） | 候補 | 課題の公開先として一般的で、インフラの経験も積める |
