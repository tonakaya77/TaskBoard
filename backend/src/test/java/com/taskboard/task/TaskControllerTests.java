package com.taskboard.task;

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
 * タスクを読み取る API のテスト。
 * 各テストはトランザクションの中で動き、終わったら元に戻る。
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class TaskControllerTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcClient jdbc;

	private long projectA;
	private long projectB;
	private long reportTaskId;

	/** プロジェクト A にタスク2つ、プロジェクト B にタスク1つを作る。 */
	@BeforeEach
	void createData() {
		long userId = insert("INSERT INTO users (name, email, password) VALUES ('テスト', 'test@example.com', 'hash') RETURNING id");
		projectA = insert("INSERT INTO projects (user_id, title, color) VALUES (" + userId + ", 'A', '#3B82F6') RETURNING id");
		projectB = insert("INSERT INTO projects (user_id, title, color) VALUES (" + userId + ", 'B', '#22C55E') RETURNING id");
		long statusA = insert("INSERT INTO statuses (project_id, name, position) VALUES (" + projectA + ", '未着手', 1) RETURNING id");
		long statusB = insert("INSERT INTO statuses (project_id, name, position) VALUES (" + projectB + ", '未着手', 1) RETURNING id");

		reportTaskId = jdbc.sql("""
				INSERT INTO tasks (project_id, status_id, title, description, due_date, position)
				VALUES (?, ?, 'レポート提出', '第3回課題', '2026-11-01', 1) RETURNING id
				""").params(projectA, statusA).query(Long.class).single();
		insertTask(projectA, statusA, "資料作成", 2);
		insertTask(projectB, statusB, "買い物", 1);
	}

	@Test
	void findAllReturnsAllTasksInIdOrder() throws Exception {
		mockMvc.perform(get("/api/tasks"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(3)))
				.andExpect(jsonPath("$[*].title").value(contains("レポート提出", "資料作成", "買い物")));
	}

	@Test
	void findAllFiltersByProjectId() throws Exception {
		mockMvc.perform(get("/api/tasks").param("projectId", String.valueOf(projectB)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].title").value("買い物"))
				.andExpect(jsonPath("$[0].projectId").value(projectB));
	}

	@Test
	void findByIdReturnsTask() throws Exception {
		mockMvc.perform(get("/api/tasks/{id}", reportTaskId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(reportTaskId))
				.andExpect(jsonPath("$.projectId").value(projectA))
				.andExpect(jsonPath("$.title").value("レポート提出"))
				.andExpect(jsonPath("$.description").value("第3回課題"))
				.andExpect(jsonPath("$.dueDate").value("2026-11-01"))
				.andExpect(jsonPath("$.todayDate").doesNotExist());
	}

	@Test
	void findByIdReturns404WhenTaskDoesNotExist() throws Exception {
		mockMvc.perform(get("/api/tasks/{id}", reportTaskId + 1000))
				.andExpect(status().isNotFound());
	}

	private void insertTask(long projectId, long statusId, String title, int position) {
		jdbc.sql("INSERT INTO tasks (project_id, status_id, title, position) VALUES (?, ?, ?, ?)")
				.params(projectId, statusId, title, position).update();
	}

	private long insert(String sql) {
		return jdbc.sql(sql).query(Long.class).single();
	}
}
