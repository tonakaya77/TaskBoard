package com.taskboard.status;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
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
 * ステータス一覧 API のテスト。
 * 各テストはトランザクションの中で動き、終わったら元に戻る。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class StatusControllerTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcClient jdbc;

	private long userId;
	private long projectA;

	/** プロジェクト A にステータス3つ（入れる順と並び順を変える）、プロジェクト B に1つを作る。 */
	@BeforeEach
	void createData() {
		userId = insert("INSERT INTO users (name, email, password) VALUES ('テスト', 'test@example.com', 'hash') RETURNING id");
		projectA = insertProject("A");
		long projectB = insertProject("B");
		insertStatus(projectA, "完了", 3);
		insertStatus(projectA, "未着手", 1);
		insertStatus(projectA, "進行中", 2);
		insertStatus(projectB, "未着手", 1);
	}

	@Test
	void findByProjectIdReturnsStatusesInPositionOrder() throws Exception {
		mockMvc.perform(get("/api/projects/{projectId}/statuses", projectA))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(3)))
				.andExpect(jsonPath("$[*].name").value(contains("未着手", "進行中", "完了")))
				.andExpect(jsonPath("$[*].position").value(contains(1, 2, 3)))
				.andExpect(jsonPath("$[0].projectId").value(projectA));
	}

	@Test
	void findByProjectIdReturnsEmptyListWhenProjectHasNoStatuses() throws Exception {
		long emptyProject = insertProject("空");

		mockMvc.perform(get("/api/projects/{projectId}/statuses", emptyProject))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void findByProjectIdReturnsEmptyListWhenProjectDoesNotExist() throws Exception {
		mockMvc.perform(get("/api/projects/{projectId}/statuses", projectA + 1000))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(0)));
	}

	private long insertProject(String title) {
		return jdbc.sql("INSERT INTO projects (user_id, title, color) VALUES (?, ?, '#3B82F6') RETURNING id")
				.params(userId, title).query(Long.class).single();
	}

	private void insertStatus(long projectId, String name, int position) {
		jdbc.sql("INSERT INTO statuses (project_id, name, position) VALUES (?, ?, ?)")
				.params(projectId, name, position).update();
	}

	private long insert(String sql) {
		return jdbc.sql(sql).query(Long.class).single();
	}
}
