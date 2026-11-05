-- 行を更新したときに updated_at を現在日時へ変える関数。
-- 各テーブルのトリガーから呼ぶ。SQL で updated_at を書き忘れても、必ず更新される。
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
