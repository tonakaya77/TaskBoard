-- ステータス（ボードの列）
CREATE TABLE statuses (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- プロジェクトを削除すると、ステータスもまとめて削除する
    project_id BIGINT      NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    name       VARCHAR(20) NOT NULL,
    position   INT         NOT NULL,                -- 並び順
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- tasks と projects の複合外部キーの参照先にする
    CONSTRAINT uk_statuses_project_id UNIQUE (project_id, id)
);

-- ボードの列と、プロジェクト設定のステータスを並び順に出す
CREATE INDEX idx_statuses_project_position ON statuses (project_id, position);

CREATE TRIGGER trg_statuses_updated_at
    BEFORE UPDATE ON statuses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 初期・完了ステータスは、そのプロジェクトのステータスに限る（複合外部キー）。
-- 参照されている間は、そのステータスを削除できない。
-- プロジェクトごと削除するときは、プロジェクトの行も一緒に消えるので問題ない。
ALTER TABLE projects
    ADD CONSTRAINT fk_projects_default_status
        FOREIGN KEY (id, default_status_id) REFERENCES statuses (project_id, id),
    ADD CONSTRAINT fk_projects_done_status
        FOREIGN KEY (id, done_status_id) REFERENCES statuses (project_id, id);
