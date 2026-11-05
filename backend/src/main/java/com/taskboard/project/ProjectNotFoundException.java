package com.taskboard.project;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 指定した ID のプロジェクトがない。API は 404 を、ProblemDetail の形（detail に文言）で返す。 */
public class ProjectNotFoundException extends ResponseStatusException {

	public ProjectNotFoundException(long id) {
		super(HttpStatus.NOT_FOUND, "プロジェクトが見つかりません（id=" + id + "）");
	}
}
