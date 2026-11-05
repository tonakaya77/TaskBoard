package com.taskboard.task;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * タスク（tasks テーブルの1行）。API はこの形の JSON を返す。
 */
public record Task(
		Long id,
		Long projectId,
		Long statusId,
		String title,
		String description,
		LocalDate dueDate,
		Integer position,
		LocalDate todayDate,
		Integer todayOrder,
		OffsetDateTime createdAt,
		OffsetDateTime updatedAt) {
}
