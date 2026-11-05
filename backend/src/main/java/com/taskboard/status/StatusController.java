package com.taskboard.status;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatusController {

	private final StatusService statusService;

	public StatusController(StatusService statusService) {
		this.statusService = statusService;
	}

	/**
	 * プロジェクトのステータス（ボードの列）。並び順。例: GET /api/projects/1/statuses。
	 * プロジェクトがないときも空の配列を返す。
	 */
	@GetMapping("/api/projects/{projectId}/statuses")
	public List<Status> findByProjectId(@PathVariable long projectId) {
		return statusService.findByProjectId(projectId);
	}
}
