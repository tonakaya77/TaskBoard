package com.taskboard.task;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.taskboard.TestcontainersConfiguration;

/**
 * タスクを読み取る API、登録する API、更新する API のテスト。
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
	private long statusA;
	private long statusB;
	private long reportTaskId;

	/** プロジェクト A にタスク2つ、プロジェクト B にタスク1つを作る。 */
	@BeforeEach
	void createData() {
		long userId = insert("INSERT INTO users (name, email, password) VALUES ('テスト', 'test@example.com', 'hash') RETURNING id");
		projectA = insert("INSERT INTO projects (user_id, title, color) VALUES (" + userId + ", 'A', '#3B82F6') RETURNING id");
		projectB = insert("INSERT INTO projects (user_id, title, color) VALUES (" + userId + ", 'B', '#22C55E') RETURNING id");
		statusA = insert("INSERT INTO statuses (project_id, name, position) VALUES (" + projectA + ", '未着手', 1) RETURNING id");
		statusB = insert("INSERT INTO statuses (project_id, name, position) VALUES (" + projectB + ", '未着手', 1) RETURNING id");

		reportTaskId = jdbc.sql("""
				INSERT INTO tasks (project_id, status_id, title, description, due_date, urgency, position)
				VALUES (?, ?, 'レポート提出', '第3回課題', '2026-11-01', 'HIGH', 1) RETURNING id
				""").params(projectA, statusA).query(Long.class).single();
		insertTask(projectA, statusA, "資料作成", 2);
		insertTask(projectB, statusB, "買い物", 1);
	}

	@Test
	void findAllReturnsAllTasksInIdOrder() throws Exception {
		mockMvc.perform(get("/api/tasks"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(3)))
				.andExpect(jsonPath("$[*].title").value(contains("レポート提出", "資料作成", "買い物")))
				// 緊急度を指定しなかったタスクは、初期値の NORMAL になる
				.andExpect(jsonPath("$[*].urgency").value(contains("HIGH", "NORMAL", "NORMAL")));
	}

	@Test
	void findByStatusIdReturnsTasksInPositionOrder() throws Exception {
		// ID は一番大きいが、列の中では一番上に置いたタスク
		insertTask(projectA, statusA, "割り込み", 0);

		mockMvc.perform(get("/api/tasks/status/{statusId}", statusA))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[*].title").value(contains("割り込み", "レポート提出", "資料作成")))
				.andExpect(jsonPath("$[*].urgency").value(contains("NORMAL", "HIGH", "NORMAL")))
				.andExpect(jsonPath("$[*].statusId").value(contains(
						(int) statusA, (int) statusA, (int) statusA)));
	}

	@Test
	void findByStatusIdReturnsEmptyListWhenStatusHasNoTasks() throws Exception {
		long emptyStatus = insert("INSERT INTO statuses (project_id, name, position) VALUES (" + projectA + ", '完了', 2) RETURNING id");

		mockMvc.perform(get("/api/tasks/status/{statusId}", emptyStatus))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(0)));
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
				.andExpect(jsonPath("$.urgency").value("HIGH"))
				.andExpect(jsonPath("$.todayDate").doesNotExist());
	}

	@Test
	void findByIdReturns404WhenTaskDoesNotExist() throws Exception {
		mockMvc.perform(get("/api/tasks/{id}", reportTaskId + 1000))
				.andExpect(status().isNotFound());
	}

	@Test
	void createAddsTaskToBottomOfColumn() throws Exception {
		mockMvc.perform(post("/api/projects/{projectId}/tasks", projectA)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"title": "  発表準備  ", "description": "スライドを作る", "dueDate": "2026-11-20",
						 "urgency": "MEDIUM", "statusId": %d}
						""".formatted(statusA)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").isNumber())
				.andExpect(jsonPath("$.projectId").value(projectA))
				.andExpect(jsonPath("$.statusId").value(statusA))
				// 前後の空白は除いて保存する
				.andExpect(jsonPath("$.title").value("発表準備"))
				.andExpect(jsonPath("$.description").value("スライドを作る"))
				.andExpect(jsonPath("$.dueDate").value("2026-11-20"))
				.andExpect(jsonPath("$.urgency").value("MEDIUM"))
				// 列にはすでに position 1・2 のタスクがあるので、その下に入る
				.andExpect(jsonPath("$.position").value(3));

		mockMvc.perform(get("/api/tasks/status/{statusId}", statusA))
				.andExpect(jsonPath("$[*].title").value(contains("レポート提出", "資料作成", "発表準備")));
	}

	@Test
	void createUsesDefaultsWhenOptionalFieldsAreOmitted() throws Exception {
		long todoStatus = insert("INSERT INTO statuses (project_id, name, position) VALUES (" + projectA + ", '未着手', 0) RETURNING id");
		jdbc.sql("UPDATE projects SET default_status_id = ? WHERE id = ?").params(todoStatus, projectA).update();

		mockMvc.perform(post("/api/projects/{projectId}/tasks", projectA)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"title": "メモ", "description": ""}
						"""))
				.andExpect(status().isCreated())
				// ステータスを省くと初期ステータス、緊急度を省くと通常、空の説明はなしにする
				.andExpect(jsonPath("$.statusId").value(todoStatus))
				.andExpect(jsonPath("$.urgency").value("NORMAL"))
				.andExpect(jsonPath("$.description").doesNotExist())
				.andExpect(jsonPath("$.dueDate").doesNotExist())
				// 空の列なので一番上（1）
				.andExpect(jsonPath("$.position").value(1));
	}

	@Test
	void createReturns400WhenTitleIsBlank() throws Exception {
		postTask(projectA, """
				{"title": "   ", "statusId": %d}
				""".formatted(statusA))
				.andExpect(status().isBadRequest());
	}

	@Test
	void createReturns400WhenTitleIsTooLong() throws Exception {
		postTask(projectA, """
				{"title": "%s", "statusId": %d}
				""".formatted("あ".repeat(51), statusA))
				.andExpect(status().isBadRequest());
	}

	@Test
	void createAcceptsTitleAndDescriptionAtMaxLength() throws Exception {
		postTask(projectA, """
				{"title": "%s", "description": "%s", "statusId": %d}
				""".formatted("あ".repeat(50), "い".repeat(1000), statusA))
				.andExpect(status().isCreated());
	}

	@Test
	void createReturns400WhenDescriptionIsTooLong() throws Exception {
		postTask(projectA, """
				{"title": "長い説明", "description": "%s", "statusId": %d}
				""".formatted("い".repeat(1001), statusA))
				.andExpect(status().isBadRequest());
	}

	@Test
	void createReturns400WhenStatusBelongsToAnotherProject() throws Exception {
		postTask(projectA, """
				{"title": "別の列", "statusId": %d}
				""".formatted(statusB))
				.andExpect(status().isBadRequest());

		mockMvc.perform(get("/api/tasks/status/{statusId}", statusB))
				.andExpect(jsonPath("$", hasSize(1)));
	}

	@Test
	void createReturns400WhenStatusIsOmittedAndProjectHasNoDefaultStatus() throws Exception {
		postTask(projectB, """
				{"title": "初期ステータスなし"}
				""")
				.andExpect(status().isBadRequest());
	}

	@Test
	void createReturns404WhenProjectDoesNotExist() throws Exception {
		postTask(projectA + 1000, """
				{"title": "どこにもない", "statusId": %d}
				""".formatted(statusA))
				.andExpect(status().isNotFound());
	}

	@Test
	void updateReplacesAllFields() throws Exception {
		putTask(reportTaskId, """
				{"title": "  レポート再提出  ", "description": "", "dueDate": null,
				 "urgency": "NORMAL", "statusId": %d}
				""".formatted(statusA))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(reportTaskId))
				// 前後の空白は除き、空の説明はなしにする
				.andExpect(jsonPath("$.title").value("レポート再提出"))
				.andExpect(jsonPath("$.description").doesNotExist())
				.andExpect(jsonPath("$.dueDate").doesNotExist())
				.andExpect(jsonPath("$.urgency").value("NORMAL"))
				.andExpect(jsonPath("$.statusId").value(statusA))
				// 同じステータスなので、並び順は変わらない
				.andExpect(jsonPath("$.position").value(1));

		mockMvc.perform(get("/api/tasks/{id}", reportTaskId))
				.andExpect(jsonPath("$.title").value("レポート再提出"));
	}

	@Test
	void updateMovesTaskToBottomOfNewColumnWhenStatusChanges() throws Exception {
		long doingStatus = insert("INSERT INTO statuses (project_id, name, position) VALUES (" + projectA + ", '進行中', 2) RETURNING id");
		insertTask(projectA, doingStatus, "調べもの", 5);

		putTask(reportTaskId, """
				{"title": "レポート提出", "description": "第3回課題", "dueDate": "2026-11-01",
				 "urgency": "HIGH", "statusId": %d}
				""".formatted(doingStatus))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.statusId").value(doingStatus))
				// 移った先の列の一番下（いまの一番下は 5）
				.andExpect(jsonPath("$.position").value(6));

		mockMvc.perform(get("/api/tasks/status/{statusId}", doingStatus))
				.andExpect(jsonPath("$[*].title").value(contains("調べもの", "レポート提出")));
		mockMvc.perform(get("/api/tasks/status/{statusId}", statusA))
				.andExpect(jsonPath("$[*].title").value(contains("資料作成")));
	}

	@Test
	void updateMovesTaskToTopWhenNewColumnIsEmpty() throws Exception {
		long emptyStatus = insert("INSERT INTO statuses (project_id, name, position) VALUES (" + projectA + ", '完了', 2) RETURNING id");

		putTask(reportTaskId, """
				{"title": "レポート提出", "urgency": "HIGH", "statusId": %d}
				""".formatted(emptyStatus))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.position").value(1));
	}

	@Test
	void updateReturns400WhenTitleIsBlank() throws Exception {
		putTask(reportTaskId, """
				{"title": "   ", "urgency": "HIGH", "statusId": %d}
				""".formatted(statusA))
				.andExpect(status().isBadRequest());
	}

	@Test
	void updateReturns400WhenTitleIsTooLong() throws Exception {
		putTask(reportTaskId, """
				{"title": "%s", "urgency": "HIGH", "statusId": %d}
				""".formatted("あ".repeat(51), statusA))
				.andExpect(status().isBadRequest());
	}

	@Test
	void updateReturns400WhenDescriptionIsTooLong() throws Exception {
		putTask(reportTaskId, """
				{"title": "長い説明", "description": "%s", "urgency": "HIGH", "statusId": %d}
				""".formatted("い".repeat(1001), statusA))
				.andExpect(status().isBadRequest());
	}

	@Test
	void updateReturns400WhenUrgencyIsOmitted() throws Exception {
		putTask(reportTaskId, """
				{"title": "緊急度なし", "statusId": %d}
				""".formatted(statusA))
				.andExpect(status().isBadRequest());
	}

	@Test
	void updateReturns400WhenStatusIsOmitted() throws Exception {
		putTask(reportTaskId, """
				{"title": "ステータスなし", "urgency": "HIGH"}
				""")
				.andExpect(status().isBadRequest());
	}

	@Test
	void updateReturns400WhenStatusBelongsToAnotherProject() throws Exception {
		putTask(reportTaskId, """
				{"title": "別の列", "urgency": "HIGH", "statusId": %d}
				""".formatted(statusB))
				.andExpect(status().isBadRequest());

		// 更新されていない
		mockMvc.perform(get("/api/tasks/{id}", reportTaskId))
				.andExpect(jsonPath("$.title").value("レポート提出"))
				.andExpect(jsonPath("$.statusId").value(statusA));
	}

	@Test
	void updateReturns404WhenTaskDoesNotExist() throws Exception {
		putTask(reportTaskId + 1000, """
				{"title": "どこにもない", "urgency": "HIGH", "statusId": %d}
				""".formatted(statusA))
				.andExpect(status().isNotFound());
	}

	private ResultActions putTask(long id, String json) throws Exception {
		return mockMvc.perform(put("/api/tasks/{id}", id)
				.contentType(MediaType.APPLICATION_JSON)
				.content(json));
	}

	private ResultActions postTask(long projectId, String json) throws Exception {
		return mockMvc.perform(post("/api/projects/{projectId}/tasks", projectId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(json));
	}

	private void insertTask(long projectId, long statusId, String title, int position) {
		jdbc.sql("INSERT INTO tasks (project_id, status_id, title, position) VALUES (?, ?, ?, ?)")
				.params(projectId, statusId, title, position).update();
	}

	private long insert(String sql) {
		return jdbc.sql(sql).query(Long.class).single();
	}
}
