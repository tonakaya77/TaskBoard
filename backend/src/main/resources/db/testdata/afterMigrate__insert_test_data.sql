-- 開発用のテストデータ。内容はモック（mock/app.js）の初期データと同じ。
-- 緊急度は、画面設計（docs/screens.md）のワイヤーフレームの例と同じ。
-- Flyway の afterMigrate コールバックなので、起動するたびに実行される。
-- 二重に入らないよう、テスト用ユーザーがいないときだけ入れる。
-- 入れ直したいときは、データベースを作り直す（docker compose down -v）。
DO $$
DECLARE
    v_user_id     BIGINT;
    v_kadai_id    BIGINT;  -- プロジェクト「課題」
    v_kaji_id     BIGINT;  -- プロジェクト「家事」
    v_kadai_todo  BIGINT;
    v_kadai_doing BIGINT;
    v_kadai_done  BIGINT;
    v_kaji_todo   BIGINT;
    v_kaji_done   BIGINT;
    v_task_id     BIGINT;
    -- 今日やるタスクの日付。「今日」は朝4時に切り替わる（日本時間）
    v_today       DATE := ((now() AT TIME ZONE 'Asia/Tokyo') - INTERVAL '4 hours')::date;
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE email = 'yamada@example.com') THEN
        RETURN;
    END IF;

    -- ログイン機能はまだないので、パスワードは仮の値。ログイン機能を作るときにハッシュへ置き換える
    INSERT INTO users (name, email, password)
    VALUES ('山田 太郎', 'yamada@example.com', 'not-hashed-yet')
    RETURNING id INTO v_user_id;

    -- プロジェクト「課題」とステータス
    INSERT INTO projects (user_id, title, color) VALUES (v_user_id, '課題', '#3B82F6') RETURNING id INTO v_kadai_id;
    INSERT INTO statuses (project_id, name, position) VALUES (v_kadai_id, '未着手', 1) RETURNING id INTO v_kadai_todo;
    INSERT INTO statuses (project_id, name, position) VALUES (v_kadai_id, '進行中', 2) RETURNING id INTO v_kadai_doing;
    INSERT INTO statuses (project_id, name, position) VALUES (v_kadai_id, '確認中', 3);
    INSERT INTO statuses (project_id, name, position) VALUES (v_kadai_id, '完了',   4) RETURNING id INTO v_kadai_done;
    UPDATE projects SET default_status_id = v_kadai_todo, done_status_id = v_kadai_done WHERE id = v_kadai_id;

    -- プロジェクト「家事」とステータス
    INSERT INTO projects (user_id, title, color) VALUES (v_user_id, '家事', '#22C55E') RETURNING id INTO v_kaji_id;
    INSERT INTO statuses (project_id, name, position) VALUES (v_kaji_id, '未着手', 1) RETURNING id INTO v_kaji_todo;
    INSERT INTO statuses (project_id, name, position) VALUES (v_kaji_id, '進行中', 2);
    INSERT INTO statuses (project_id, name, position) VALUES (v_kaji_id, '確認中', 3);
    INSERT INTO statuses (project_id, name, position) VALUES (v_kaji_id, '完了',   4) RETURNING id INTO v_kaji_done;
    UPDATE projects SET default_status_id = v_kaji_todo, done_status_id = v_kaji_done WHERE id = v_kaji_id;

    -- タスクとサブタスク
    INSERT INTO tasks (project_id, status_id, title, description, due_date, urgency, position, today_date, today_order)
    VALUES (v_kadai_id, v_kadai_doing, 'レポート提出', '第3回課題のレポートを提出する。', '2026-11-01', 'MEDIUM', 1, v_today, 1)
    RETURNING id INTO v_task_id;
    INSERT INTO subtasks (task_id, title, is_done, position) VALUES
        (v_task_id, '資料を集める', true,  1),
        (v_task_id, '下書きを書く', false, 2),
        (v_task_id, '見直す',       false, 3);

    INSERT INTO tasks (project_id, status_id, title, description, due_date, position, today_date, today_order)
    VALUES (v_kaji_id, v_kaji_todo, '買い物', '牛乳、卵、パン', '2026-11-10', 1, v_today, 2);

    INSERT INTO tasks (project_id, status_id, title, due_date, urgency, position)
    VALUES (v_kadai_id, v_kadai_todo, '資料作成', '2026-11-03', 'HIGH', 1)
    RETURNING id INTO v_task_id;
    INSERT INTO subtasks (task_id, title, position) VALUES
        (v_task_id, '構成を決める',   1),
        (v_task_id, 'スライドを作る', 2);

    INSERT INTO tasks (project_id, status_id, title, position)
    VALUES (v_kadai_id, v_kadai_todo, '振り返りを書く', 2);

    -- 緊急度は高だが、完了なので画面には出ない例
    INSERT INTO tasks (project_id, status_id, title, due_date, urgency, position)
    VALUES (v_kadai_id, v_kadai_done, '参考書を買う', '2026-11-02', 'HIGH', 1);

    INSERT INTO tasks (project_id, status_id, title, due_date, position)
    VALUES (v_kaji_id, v_kaji_todo, '掃除', '2026-11-15', 2);
END
$$;
