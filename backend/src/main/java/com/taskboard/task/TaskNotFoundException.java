package com.taskboard.task;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 指定した ID のタスクがない。API は 404 を、ProblemDetail の形（detail に文言）で返す。 */
public class TaskNotFoundException extends ResponseStatusException {

	public TaskNotFoundException(long id) {
		super(HttpStatus.NOT_FOUND, "タスクが見つかりません（id=" + id + "）");
	}
}
