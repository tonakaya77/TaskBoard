package com.taskboard.status;

import java.time.OffsetDateTime;

/**
 * ステータス（statuses テーブルの1行。ボードの列）。API はこの形の JSON を返す。
 */
public record Status(
		Long id,
		Long projectId,
		String name,
		Integer position,
		OffsetDateTime createdAt,
		OffsetDateTime updatedAt) {
}
