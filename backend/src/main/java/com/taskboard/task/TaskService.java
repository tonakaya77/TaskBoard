package com.taskboard.task;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taskboard.project.Project;
import com.taskboard.project.ProjectMapper;
import com.taskboard.project.ProjectNotFoundException;
import com.taskboard.status.StatusMapper;

@Service
public class TaskService {

	private final TaskMapper taskMapper;
	private final ProjectMapper projectMapper;
	private final StatusMapper statusMapper;

	public TaskService(TaskMapper taskMapper, ProjectMapper projectMapper, StatusMapper statusMapper) {
		this.taskMapper = taskMapper;
		this.projectMapper = projectMapper;
		this.statusMapper = statusMapper;
	}

	/** 全タスク。 */
	public List<Task> findAll() {
		return taskMapper.findAll();
	}

	/** ステータス（ボードの列）のタスク。列の中の並び順にする。 */
	public List<Task> findByStatusId(long statusId) {
		return taskMapper.findByStatusId(statusId);
	}

	/** タスク1件。ないときは TaskNotFoundException。 */
	public Task findById(long id) {
		return taskMapper.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
	}

	/**
	 * タスクを登録して、登録したタスクを返す（docs/functions.md の F-04）。
	 * プロジェクトがないときは ProjectNotFoundException、
	 * ステータスがそのプロジェクトのものでないときは InvalidStatusException。
	 */
	@Transactional
	public Task create(long projectId, CreateTaskRequest request) {
		Project project = projectMapper.findById(projectId)
				.orElseThrow(() -> new ProjectNotFoundException(projectId));

		// ステータスを省いたときは、初期ステータス（未着手）に入れる
		Long statusId = request.statusId() != null ? request.statusId() : project.defaultStatusId();
		if (statusId == null || !statusMapper.existsInProject(projectId, statusId)) {
			throw new InvalidStatusException(projectId, statusId);
		}

		Urgency urgency = request.urgency() != null ? request.urgency() : Urgency.NORMAL;
		String description = request.description() == null || request.description().isEmpty()
				? null
				: request.description();

		long id = taskMapper.insert(projectId, statusId, request.title().strip(), description,
				request.dueDate(), urgency);
		return findById(id);
	}
}
