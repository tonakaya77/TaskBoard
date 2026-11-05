package com.taskboard.project;

import org.springframework.stereotype.Service;

@Service
public class ProjectService {

	private final ProjectMapper projectMapper;

	public ProjectService(ProjectMapper projectMapper) {
		this.projectMapper = projectMapper;
	}

	/** プロジェクト1件。ないときは ProjectNotFoundException。 */
	public Project findById(long id) {
		return projectMapper.findById(id).orElseThrow(() -> new ProjectNotFoundException(id));
	}
}
