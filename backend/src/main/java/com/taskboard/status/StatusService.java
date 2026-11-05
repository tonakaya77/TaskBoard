package com.taskboard.status;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StatusService {

	private final StatusMapper statusMapper;

	public StatusService(StatusMapper statusMapper) {
		this.statusMapper = statusMapper;
	}

	/** プロジェクトのステータス。並び順にする。 */
	@Transactional(readOnly = true)
	public List<Status> findByProjectId(long projectId) {
		return statusMapper.findByProjectId(projectId);
	}
}
