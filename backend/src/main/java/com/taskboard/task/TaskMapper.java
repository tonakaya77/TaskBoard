package com.taskboard.task;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface TaskMapper {

	/** 全タスクを ID 順に返す。 */
	@Select("""
			SELECT id, project_id, status_id, title, description, due_date, urgency, position,
			       today_date, today_order, created_at, updated_at
			  FROM tasks
			 ORDER BY id
			""")
	List<Task> findAll();

	/** ステータス（ボードの列）のタスクを、列の中の並び順に返す。 */
	@Select("""
			SELECT id, project_id, status_id, title, description, due_date, urgency, position,
			       today_date, today_order, created_at, updated_at
			  FROM tasks
			 WHERE status_id = #{statusId}
			 ORDER BY position, id
			""")
	List<Task> findByStatusId(long statusId);

	/** ID でタスクを1件返す。ないときは空。 */
	@Select("""
			SELECT id, project_id, status_id, title, description, due_date, urgency, position,
			       today_date, today_order, created_at, updated_at
			  FROM tasks
			 WHERE id = #{id}
			""")
	Optional<Task> findById(long id);

	/**
	 * タスクを登録して、その ID を返す。列（ステータス）の一番下に入れる（docs/functions.md の F-04）。
	 * 値を返す INSERT なので @Select で書き、キャッシュを消すようにする。
	 */
	@Select("""
			INSERT INTO tasks (project_id, status_id, title, description, due_date, urgency, position)
			SELECT #{projectId}, #{statusId}, #{title}, #{description}, #{dueDate}, #{urgency},
			       COALESCE(MAX(position), 0) + 1
			  FROM tasks
			 WHERE status_id = #{statusId}
			RETURNING id
			""")
	@Options(flushCache = Options.FlushCachePolicy.TRUE)
	long insert(
			@Param("projectId") long projectId,
			@Param("statusId") long statusId,
			@Param("title") String title,
			@Param("description") String description,
			@Param("dueDate") LocalDate dueDate,
			@Param("urgency") Urgency urgency);

	/**
	 * タスクの内容を置き換える（docs/functions.md の UC-10）。
	 * ステータスが変わったときは、移った先の列の一番下に入れる（F-05）。同じステータスなら並び順はそのまま。
	 * updated_at はトリガーが更新する。
	 */
	@Update("""
			UPDATE tasks
			   SET title = #{title},
			       description = #{description},
			       due_date = #{dueDate},
			       urgency = #{urgency},
			       position = CASE
			           WHEN status_id = #{statusId} THEN position
			           ELSE (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks WHERE status_id = #{statusId})
			       END,
			       status_id = #{statusId}
			 WHERE id = #{id}
			""")
	void update(
			@Param("id") long id,
			@Param("statusId") long statusId,
			@Param("title") String title,
			@Param("description") String description,
			@Param("dueDate") LocalDate dueDate,
			@Param("urgency") Urgency urgency);

	/** タスクのステータスと、列の中の並び順を変える（docs/functions.md の UC-12）。 */
	@Update("""
			UPDATE tasks
			   SET status_id = #{statusId},
			       position = #{position}
			 WHERE id = #{id}
			""")
	void updatePosition(
			@Param("id") long id,
			@Param("statusId") long statusId,
			@Param("position") int position);
}
