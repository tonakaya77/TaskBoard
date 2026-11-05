package com.taskboard.task;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 指定したステータスが、そのプロジェクトのものではない。API は 400 を、ProblemDetail の形（detail に文言）で返す。 */
public class InvalidStatusException extends ResponseStatusException {

	public InvalidStatusException(long projectId, Long statusId) {
		super(HttpStatus.BAD_REQUEST,
				"このプロジェクトのステータスではありません（projectId=" + projectId + ", statusId=" + statusId + "）");
	}
}
