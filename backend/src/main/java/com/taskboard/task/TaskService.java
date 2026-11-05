package com.taskboard.task;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class TaskService {

	private final TaskMapper taskMapper;

	public TaskService(TaskMapper taskMapper) {
		this.taskMapper = taskMapper;
	}

	/** タスクの一覧。projectId を渡すと、そのプロジェクトのタスクだけにする。 */
	public List<Task> findAll(Long projectId) {
		return taskMapper.findAll(projectId);
	}

	/** タスク1件。ないときは TaskNotFoundException。 */
	public Task findById(long id) {
		return taskMapper.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
	}
}
