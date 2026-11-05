package com.taskboard.project;

import java.time.OffsetDateTime;

/**
 * プロジェクト（projects テーブルの1行）。API はこの形の JSON を返す。
 * 初期ステータス（未着手）と完了ステータスは、名前ではなく ID で判断する（docs/functions.md の F-03）。
 */
public record Project(
		Long id,
		Long userId,
		String title,
		String color,
		Long defaultStatusId,
		Long doneStatusId,
		OffsetDateTime createdAt,
		OffsetDateTime updatedAt) {
}
