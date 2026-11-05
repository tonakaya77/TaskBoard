-- サブタスク
CREATE TABLE subtasks (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- タスクを削除すると、サブタスクもまとめて削除する
    task_id    BIGINT      NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    title      VARCHAR(50) NOT NULL,
    is_done    BOOLEAN     NOT NULL DEFAULT false,  -- 完了したか
    position   INT         NOT NULL,                -- 並び順
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- タスク詳細で、サブタスクを並び順に出す
CREATE INDEX idx_subtasks_task_position ON subtasks (task_id, position);

CREATE TRIGGER trg_subtasks_updated_at
    BEFORE UPDATE ON subtasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
