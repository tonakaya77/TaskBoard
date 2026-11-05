package com.taskboard.task;

import java.util.ArrayList;
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
	@Transactional(readOnly = true)
	public List<Task> findAll() {
		return taskMapper.findAll();
	}

	/** ステータス（ボードの列）のタスク。列の中の並び順にする。 */
	@Transactional(readOnly = true)
	public List<Task> findByStatusId(long statusId) {
		return taskMapper.findByStatusId(statusId);
	}

	/** タスク1件。ないときは TaskNotFoundException。 */
	@Transactional(readOnly = true)
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

	/**
	 * タスクを、指定した列の指定した位置へ移して、移したあとのタスクを返す（docs/functions.md の UC-12）。
	 * 移った先の列の並び順は 1, 2, 3… に振り直す。移る前の列は振り直さない（間が空くだけで順番は変わらない）。
	 * タスクがないときは TaskNotFoundException、
	 * ステータスがタスクのプロジェクトのものでないときは InvalidStatusException。
	 */
	@Transactional
	public Task move(long id, MoveTaskRequest request) {
		Task task = findById(id);
		long projectId = task.projectId();
		long statusId = request.statusId();
		if (!statusMapper.existsInProject(projectId, statusId)) {
			throw new InvalidStatusException(projectId, statusId);
		}

		// 移った先の列の並びから動かすタスクを除き、指定の位置に差し込む
		List<Long> ids = new ArrayList<>();
		for (Task t : taskMapper.findByStatusId(statusId)) {
			if (t.id() != id) {
				ids.add(t.id());
			}
		}
		ids.add(Math.min(request.index(), ids.size()), id);

		for (int i = 0; i < ids.size(); i++) {
			taskMapper.updatePosition(ids.get(i), statusId, i + 1);
		}
		return findById(id);
	}

	/**
	 * タスクを削除する（docs/functions.md の UC-11）。サブタスクもまとめて消える。
	 * タスクがないときは TaskNotFoundException。
	 */
	@Transactional
	public void delete(long id) {
		findById(id);
		taskMapper.delete(id);
	}

	/** 空の説明は「説明なし」（null）として保存する。 */
	private static String normalizeDescription(String description) {
		return description == null || description.isEmpty() ? null : description;
	}
}
