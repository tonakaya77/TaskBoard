package com.taskboard.status;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class StatusService {

	private final StatusMapper statusMapper;

	public StatusService(StatusMapper statusMapper) {
		this.statusMapper = statusMapper;
	}

	/** プロジェクトのステータス。並び順にする。 */
	public List<Status> findByProjectId(long projectId) {
		return statusMapper.findByProjectId(projectId);
	}
}
