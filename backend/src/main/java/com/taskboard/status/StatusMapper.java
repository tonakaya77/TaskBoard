package com.taskboard.status;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface StatusMapper {

	/** プロジェクトのステータスを、並び順（ボードの列の順）に返す。 */
	@Select("""
			SELECT id, project_id, name, position, created_at, updated_at
			  FROM statuses
			 WHERE project_id = #{projectId}
			 ORDER BY position, id
			""")
	List<Status> findByProjectId(long projectId);
}
