package com.taskboard.task;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

	private final TaskService taskService;

	public TaskController(TaskService taskService) {
		this.taskService = taskService;
	}

	/** タスクの一覧。例: GET /api/tasks、GET /api/tasks?projectId=1 */
	@GetMapping
	public List<Task> findAll(@RequestParam(required = false) Long projectId) {
		return taskService.findAll(projectId);
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
