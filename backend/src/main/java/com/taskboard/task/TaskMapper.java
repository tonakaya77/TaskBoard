package com.taskboard.task;

import java.util.List;
import java.util.Optional;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface TaskMapper {

	/** タスクを ID 順に返す。projectId が null のときは、全プロジェクトのタスクを返す。 */
	@Select("""
			<script>
			SELECT id, project_id, status_id, title, description, due_date, position,
			       today_date, today_order, created_at, updated_at
			  FROM tasks
			<where>
			  <if test="projectId != null">project_id = #{projectId}</if>
			</where>
			 ORDER BY id
			</script>
			""")
	List<Task> findAll(@Param("projectId") Long projectId);

	/** ステータス（ボードの列）のタスクを、列の中の並び順に返す。 */
	@Select("""
			SELECT id, project_id, status_id, title, description, due_date, position,
			       today_date, today_order, created_at, updated_at
			  FROM tasks
			 WHERE status_id = #{statusId}
			 ORDER BY position, id
			""")
	List<Task> findByStatusId(long statusId);

	/** ID でタスクを1件返す。ないときは空。 */
	@Select("""
			SELECT id, project_id, status_id, title, description, due_date, position,
			       today_date, today_order, created_at, updated_at
			  FROM tasks
			 WHERE id = #{id}
			""")
	Optional<Task> findById(long id);
}
