package com.taskboard.task;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * タスクを更新するときに受け取る JSON（docs/functions.md の F-04・UC-10）。
 * すべての項目をまとめて置き換えるので、登録と違って緊急度・ステータスは省けない。
 *
 * @param title       タイトル。必須で50文字まで
 * @param description 説明。1000文字まで。なくてもよい
 * @param dueDate     期限。なくてもよい
 * @param urgency     緊急度。必須
 * @param statusId    ステータス。必須。変えると、移った先の列の一番下に入る
 */
public record UpdateTaskRequest(
		@NotBlank @Size(max = 50) String title,
		@Size(max = 1000) String description,
		LocalDate dueDate,
		@NotNull Urgency urgency,
		@NotNull Long statusId) {
}
