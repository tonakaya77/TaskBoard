-- タスク
CREATE TABLE tasks (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- プロジェクトを削除すると、タスクもまとめて削除する
    project_id  BIGINT        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    status_id   BIGINT        NOT NULL,
    title       VARCHAR(50)   NOT NULL,
    description VARCHAR(1000),                       -- 説明
    due_date    DATE,                                -- 期限
    position    INT           NOT NULL,              -- 列の中の並び順
    today_date  DATE,                                -- 今日やるタスクに選んだ日（朝4時の区切りで判断した日付）
    today_order INT,                                 -- 今日やるタスクの中の並び順
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- ステータスは、同じプロジェクトのステータスに限る（複合外部キー）。
    -- タスクが残っているステータスは削除できない。
    CONSTRAINT fk_tasks_status
        FOREIGN KEY (project_id, status_id) REFERENCES statuses (project_id, id),
    -- 今日やるタスクの日付と並び順は、両方入っているか、両方空かのどちらか
    CONSTRAINT ck_tasks_today CHECK ((today_date IS NULL) = (today_order IS NULL))
);

-- ボードで、列ごとのタスクを並び順に出す。複合外部キーの確認にも使う
CREATE INDEX idx_tasks_project_status_position ON tasks (project_id, status_id, position);
-- カレンダーで、その月に期限があるタスクを出す
CREATE INDEX idx_tasks_project_due ON tasks (project_id, due_date);
-- ダッシュボードで、今日やるタスクを並び順に出す
CREATE INDEX idx_tasks_today ON tasks (today_date, today_order);

CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
