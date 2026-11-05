package com.taskboard.task;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * タスクのステータスと並び順を変えるときに受け取る JSON（docs/functions.md の F-05・UC-12）。
 *
 * @param statusId 移った先のステータス。同じ列の中で並べ替えるときは、いまのステータス
 * @param index    移った先の列の中での位置（0 始まり）。動かすタスク自身を除いた並びに差し込む。
 *                 列の数より大きいときは一番下
 */
public record MoveTaskRequest(
		@NotNull Long statusId,
		@NotNull @Min(0) Integer index) {
}
