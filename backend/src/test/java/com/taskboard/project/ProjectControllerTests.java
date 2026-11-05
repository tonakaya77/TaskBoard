package com.taskboard.project;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.taskboard.TestcontainersConfiguration;

/**
 * プロジェクトを取得する API のテスト。
 * 各テストはトランザクションの中で動き、終わったら元に戻る。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class ProjectControllerTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcClient jdbc;

	private long userId;
	private long projectId;
	private long todoStatusId;
	private long doneStatusId;

	/** 初期ステータスと完了ステータスを決めたプロジェクトを1つ作る。 */
	@BeforeEach
	void createData() {
		userId = insert("INSERT INTO users (name, email, password) VALUES ('テスト', 'test@example.com', 'hash') RETURNING id");
		projectId = insert("INSERT INTO projects (user_id, title, color) VALUES (" + userId + ", '課題', '#3B82F6') RETURNING id");
		todoStatusId = insert("INSERT INTO statuses (project_id, name, position) VALUES (" + projectId + ", '未着手', 1) RETURNING id");
		doneStatusId = insert("INSERT INTO statuses (project_id, name, position) VALUES (" + projectId + ", '完了', 2) RETURNING id");
		jdbc.sql("UPDATE projects SET default_status_id = ?, done_status_id = ? WHERE id = ?")
				.params(todoStatusId, doneStatusId, projectId).update();
	}

	@Test
	void findByIdReturnsProjectWithDefaultAndDoneStatus() throws Exception {
		mockMvc.perform(get("/api/projects/{id}", projectId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(projectId))
				.andExpect(jsonPath("$.userId").value(userId))
				.andExpect(jsonPath("$.title").value("課題"))
				.andExpect(jsonPath("$.color").value("#3B82F6"))
				.andExpect(jsonPath("$.defaultStatusId").value(todoStatusId))
				.andExpect(jsonPath("$.doneStatusId").value(doneStatusId));
	}

	@Test
	void findByIdReturns404WhenProjectDoesNotExist() throws Exception {
		mockMvc.perform(get("/api/projects/{id}", projectId + 1000))
				.andExpect(status().isNotFound());
	}

	private long insert(String sql) {
		return jdbc.sql(sql).query(Long.class).single();
	}
}
