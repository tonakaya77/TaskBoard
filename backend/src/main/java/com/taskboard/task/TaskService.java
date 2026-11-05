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

	/** ステータス（ボードの列）のタスク。列の中の並び順にする。 */
	public List<Task> findByStatusId(long statusId) {
		return taskMapper.findByStatusId(statusId);
	}

	/** タスク1件。ないときは TaskNotFoundException。 */
	public Task findById(long id) {
		return taskMapper.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
	}
}
