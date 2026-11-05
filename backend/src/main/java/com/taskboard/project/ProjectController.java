package com.taskboard.project;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

	private final ProjectService projectService;

	public ProjectController(ProjectService projectService) {
		this.projectService = projectService;
	}

	/** プロジェクト1件。例: GET /api/projects/1。ないときは 404 */
	@GetMapping("/{id}")
	public Project findById(@PathVariable long id) {
		return projectService.findById(id);
	}
}
