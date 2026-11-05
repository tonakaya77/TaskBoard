# TaskBoard 開発ルール

Claude Code はこのルールを必ず守る。守れない事情があるときは、作業を止めてユーザーに確認する。

## 作業の流れ

```
1. イシューを作る          gh issue create
2. ブランチを作る          git checkout -b feature/<イシュー番号>-<短い説明>
3. 実装してコミットする    git commit
4. チェックする            /check（スキル）
5. プッシュする            git push -u origin <ブランチ名>
6. PR を作る               gh pr create
7. マージする              gh pr merge --merge --delete-branch
8. ローカルのブランチを消す git checkout main && git pull && git branch -d <ブランチ名>
```

## イシュー

- 作業を始める前に必ずイシューを作る。先に既存のイシューを確認し、同じ内容があればそれを使う
- イシューは `gh issue create` で作り、作業内容を簡潔に書く
- テンプレート（機能追加・不具合・ドキュメント・その他）を使い、種類に合ったラベルを付ける
- 作業の途中で別の作業が必要になったら、新しいイシューを作る

## ブランチ

- 名前は `種類/イシュー番号-短い説明`。短い説明は英語のケバブケース（小文字の英単語をハイフンでつなぐ）
- 例: `feature/12-add-login`、`fix/5-null-pointer-error`、`docs/8-update-readme`
- `#` は付けない（シェルでコメント扱いになるため）
- 種類: `feature`（機能追加）/ `fix`（不具合修正）/ `docs`（ドキュメント）/ `refactor`（作り直し）/ `test`（テスト）/ `chore`（設定・雑務）
- main への直接コミット・直接プッシュは禁止。GitHub のブランチ保護でも禁止している
- 並行作業は `D:\RaiseTec\TaskBoard-worktrees\<名前>` に worktree を作って行う

## コミットメッセージ

- Conventional Commits 形式で、日本語で書く
- 形: `種類: 内容 (#イシュー番号)`。例: `feat: タスク一覧APIを追加 (#12)`
- 種類: `feat` / `fix` / `docs` / `refactor` / `test` / `style`（動きを変えない見た目の整理）/ `chore`。ブランチの種類に合わせる（`feature` → `feat`）
- 1コミットに1つの変更。これまでのコミットは書き直さない

## 開発サーバー

- ポートはアプリの設定で決めたものだけを使う。バックエンドは 8080（`backend/src/main/resources/application.properties` の `server.port`）、フロントエンドは 5173（`frontend/vite.config.ts` の `server.port`）
- 起動するときにポートが使われていたら、そのポートのプロセスを止めてから、決めたポートで起動する。別のポートで起動したり、ポートを変えて逃げたりしない
- Claude Code では、フック（`.claude/hooks/free-dev-port.mjs`）が `./gradlew bootRun`・`npm run dev`・`npx vite` の直前に、そのポートのプロセスを自動で止める
- Docker のプロセスがポートを使っているときは止めない（すべてのコンテナが落ちるため）。ユーザーに知らせて確認する
- Vite は `strictPort: true` にしてあり、ポートが空いていなければ別のポートに逃げずにエラーで止まる

## PR

- main への変更は必ず PR を通す
- PR を作る前に、スキル `/check`（`.claude/skills/check/SKILL.md`）でチェックを実行し、すべて通ってから PR を作る。CI がないので、ここで通らなければ PR を作らない
- 1つの PR に1つの話題
- タイトルは Conventional Commits の形（`種類: 内容`）。例: `feat: ログイン機能を追加`
- 説明は日本語で、テンプレートの項目（概要（何を・なぜ）・関連・変更内容・確認方法・スクリーンショット・影響範囲・注意点）に沿って書く。変更したファイルの一覧は書かない
- 「関連」に `Closes #番号` を書き、マージでイシューが閉じるようにする
- マージは `gh pr merge --merge --delete-branch`。マージ後はローカルのブランチも削除する
