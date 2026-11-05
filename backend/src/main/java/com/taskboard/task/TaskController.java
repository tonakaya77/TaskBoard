package com.taskboard.task;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

	private final TaskService taskService;

	public TaskController(TaskService taskService) {
		this.taskService = taskService;
	}

	/** 全タスク。ID 順。例: GET /api/tasks */
	@GetMapping
	public List<Task> findAll() {
		return taskService.findAll();
	}

	/** ステータス別のタスク（カンバンの列表示用）。列の中の並び順。例: GET /api/tasks/status/1 */
	@GetMapping("/status/{statusId}")
	public List<Task> findByStatusId(@PathVariable long statusId) {
		return taskService.findByStatusId(statusId);
	}

	/** タスク1件。例: GET /api/tasks/1。ないときは 404 */
	@GetMapping("/{id}")
	public Task findById(@PathVariable long id) {
		return taskService.findById(id);
	}
}
