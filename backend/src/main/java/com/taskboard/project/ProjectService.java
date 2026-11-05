package com.taskboard.project;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {

	private final ProjectMapper projectMapper;

	public ProjectService(ProjectMapper projectMapper) {
		this.projectMapper = projectMapper;
	}

	/** プロジェクト1件。ないときは ProjectNotFoundException。 */
	@Transactional(readOnly = true)
	public Project findById(long id) {
		return projectMapper.findById(id).orElseThrow(() -> new ProjectNotFoundException(id));
	}
}
