package com.taskboard.task;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * タスクを登録するときに受け取る JSON（docs/functions.md の F-04）。
 *
 * @param title       タイトル。必須で50文字まで
 * @param description 説明。1000文字まで。なくてもよい
 * @param dueDate     期限。なくてもよい
 * @param urgency     緊急度。省くと通常（NORMAL）
 * @param statusId    ステータス。省くとプロジェクトの初期ステータス（未着手）
 */
public record CreateTaskRequest(
		@NotBlank @Size(max = 50) String title,
		@Size(max = 1000) String description,
		LocalDate dueDate,
		Urgency urgency,
		Long statusId) {
}
