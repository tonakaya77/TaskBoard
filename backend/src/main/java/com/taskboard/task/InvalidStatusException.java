package com.taskboard.task;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** 指定したステータスが、そのプロジェクトのものではない。API は 400 を返す。 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidStatusException extends RuntimeException {

	public InvalidStatusException(long projectId, Long statusId) {
		super("このプロジェクトのステータスではありません（projectId=" + projectId + ", statusId=" + statusId + "）");
	}
}
