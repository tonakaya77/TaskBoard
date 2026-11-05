package com.taskboard.status;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
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

	/** そのステータスが、指定したプロジェクトのものか。 */
	@Select("""
			SELECT EXISTS (
			    SELECT 1 FROM statuses WHERE id = #{statusId} AND project_id = #{projectId}
			)
			""")
	boolean existsInProject(@Param("projectId") long projectId, @Param("statusId") long statusId);
}
