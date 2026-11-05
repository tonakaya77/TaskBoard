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

		long id = taskMapper.insert(projectId, statusId, request.title().strip(),
				normalizeDescription(request.description()), request.dueDate(), urgency);
		return findById(id);
	}

	/**
	 * タスクの内容を置き換えて、更新後のタスクを返す（docs/functions.md の UC-10）。
	 * タスクがないときは TaskNotFoundException、
	 * ステータスがタスクのプロジェクトのものでないときは InvalidStatusException。
	 */
	@Transactional
	public Task update(long id, UpdateTaskRequest request) {
		Task task = findById(id);
		long projectId = task.projectId();
		if (!statusMapper.existsInProject(projectId, request.statusId())) {
			throw new InvalidStatusException(projectId, request.statusId());
		}

		taskMapper.update(id, request.statusId(), request.title().strip(),
				normalizeDescription(request.description()), request.dueDate(), request.urgency());
		return findById(id);
	}

	/** 空の説明は「説明なし」（null）として保存する。 */
	private static String normalizeDescription(String description) {
		return description == null || description.isEmpty() ? null : description;
	}
}
