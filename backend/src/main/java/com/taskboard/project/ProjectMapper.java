package com.taskboard.project;

import java.util.Optional;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface ProjectMapper {

	/** ID でプロジェクトを1件返す。ないときは空。 */
	@Select("""
			SELECT id, user_id, title, color, default_status_id, done_status_id, created_at, updated_at
			  FROM projects
			 WHERE id = #{id}
			""")
	Optional<Project> findById(long id);
}
