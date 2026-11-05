-- タスクに緊急度を追加する。
-- 初期値が 'NORMAL' なので、すでにあるタスクは通常になる。
ALTER TABLE tasks
    ADD COLUMN urgency VARCHAR(10) NOT NULL DEFAULT 'NORMAL',
    -- 緊急度は、高（HIGH）・中（MEDIUM）・通常（NORMAL）のどれか
    ADD CONSTRAINT ck_tasks_urgency CHECK (urgency IN ('HIGH', 'MEDIUM', 'NORMAL'));
