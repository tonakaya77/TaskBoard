-- プロジェクト
-- default_status_id と done_status_id の外部キーは、statuses を作ったあと（V4）で足す。
CREATE TABLE projects (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id           BIGINT      NOT NULL REFERENCES users (id),  -- 持ち主
    title             VARCHAR(30) NOT NULL,
    color             CHAR(7)     NOT NULL,                        -- # ＋ 16進数6桁
    default_status_id BIGINT,                                      -- 初期ステータス（未着手）
    done_status_id    BIGINT,                                      -- 完了ステータス
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_projects_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- サイドメニューに、ユーザーのプロジェクトを作成した順に並べる
CREATE INDEX idx_projects_user_created ON projects (user_id, created_at);

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
