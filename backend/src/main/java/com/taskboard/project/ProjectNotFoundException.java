package com.taskboard.project;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** 指定した ID のプロジェクトがない。API は 404 を返す。 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ProjectNotFoundException extends RuntimeException {

	public ProjectNotFoundException(long id) {
		super("プロジェクトが見つかりません（id=" + id + "）");
	}
}
