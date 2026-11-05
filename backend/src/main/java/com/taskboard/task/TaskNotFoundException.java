package com.taskboard.task;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** 指定した ID のタスクがない。API は 404 を返す。 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class TaskNotFoundException extends RuntimeException {

	public TaskNotFoundException(long id) {
		super("タスクが見つかりません（id=" + id + "）");
	}
}
