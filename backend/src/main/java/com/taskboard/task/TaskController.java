package com.taskboard.task;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
public class TaskController {

	private final TaskService taskService;

	public TaskController(TaskService taskService) {
		this.taskService = taskService;
	}

	/** 全タスク。ID 順。例: GET /api/tasks */
	@GetMapping("/api/tasks")
	public List<Task> findAll() {
		return taskService.findAll();
	}

	/** ステータス別のタスク（カンバンの列表示用）。列の中の並び順。例: GET /api/tasks/status/1 */
	@GetMapping("/api/tasks/status/{statusId}")
	public List<Task> findByStatusId(@PathVariable long statusId) {
		return taskService.findByStatusId(statusId);
	}

	/** タスク1件。例: GET /api/tasks/1。ないときは 404 */
	@GetMapping("/api/tasks/{id}")
	public Task findById(@PathVariable long id) {
		return taskService.findById(id);
	}

	/**
	 * タスクを登録する。列の一番下に入れ、201 で登録したタスクを返す。例: POST /api/projects/1/tasks。
	 * 入力が正しくないときと、別のプロジェクトのステータスを指定したときは 400、プロジェクトがないときは 404
	 */
	@PostMapping("/api/projects/{projectId}/tasks")
	@ResponseStatus(HttpStatus.CREATED)
	public Task create(@PathVariable long projectId, @Valid @RequestBody CreateTaskRequest request) {
		return taskService.create(projectId, request);
	}
}
