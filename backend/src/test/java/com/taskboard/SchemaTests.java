package com.taskboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.OffsetDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

/**
 * Flyway で作ったテーブルに、データベース設計（docs/database.md）の制約が効いているかを確かめる。
 * 各テストはトランザクションの中で動き、終わったら元に戻る。
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SchemaTests {

	@Autowired
	private JdbcClient jdbc;

	private long userId;
	private long projectId;
	private long todoStatusId;
	private long doneStatusId;
	private long taskId;

	/** ユーザー・プロジェクト・ステータス2つ・タスク・サブタスクを1つずつ作る。 */
	@BeforeEach
	void createData() {
		userId = insert("INSERT INTO users (name, email, password) VALUES ('テスト', 'test@example.com', 'hash') RETURNING id");
		projectId = insert("INSERT INTO projects (user_id, title, color) VALUES (" + userId + ", 'P', '#3B82F6') RETURNING id");
		todoStatusId = insertStatus("未着手", 1);
		doneStatusId = insertStatus("完了", 2);
		jdbc.sql("UPDATE projects SET default_status_id = ?, done_status_id = ? WHERE id = ?")
				.params(todoStatusId, doneStatusId, projectId).update();
		taskId = insertTask(projectId, todoStatusId);
		insert("INSERT INTO subtasks (task_id, title, position) VALUES (" + taskId + ", 'S', 1) RETURNING id");
	}

	@Test
	void deletingProjectDeletesStatusesTasksAndSubtasks() {
		jdbc.sql("DELETE FROM projects WHERE id = ?").param(projectId).update();

		assertThat(count("statuses")).isZero();
		assertThat(count("tasks")).isZero();
		assertThat(count("subtasks")).isZero();
	}

	@Test
	void deletingTaskDeletesSubtasks() {
		jdbc.sql("DELETE FROM tasks WHERE id = ?").param(taskId).update();

		assertThat(count("subtasks")).isZero();
	}

	@Test
	void statusWithTasksCannotBeDeleted() {
		long otherStatusId = insertStatus("進行中", 3);
		insertTask(projectId, otherStatusId);

		assertThatThrownBy(() -> jdbc.sql("DELETE FROM statuses WHERE id = ?").param(otherStatusId).update())
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// PostgreSQL はトランザクションの中でエラーが起きると、そのあとの SQL を受け付けない。
	// そのため、エラーを確かめるのは1つのテストにつき1回にする。
	@Test
	void defaultStatusCannotBeDeleted() {
		jdbc.sql("DELETE FROM tasks").update();

		assertThatThrownBy(() -> jdbc.sql("DELETE FROM statuses WHERE id = ?").param(todoStatusId).update())
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void doneStatusCannotBeDeleted() {
		jdbc.sql("DELETE FROM tasks").update();

		assertThatThrownBy(() -> jdbc.sql("DELETE FROM statuses WHERE id = ?").param(doneStatusId).update())
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void taskCannotUseStatusOfAnotherProject() {
		long otherProjectId = insert("INSERT INTO projects (user_id, title, color) VALUES (" + userId + ", 'Q', '#EF4444') RETURNING id");

		assertThatThrownBy(() -> insertTask(otherProjectId, todoStatusId))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void projectCannotUseStatusOfAnotherProjectAsDefault() {
		long otherProjectId = insert("INSERT INTO projects (user_id, title, color) VALUES (" + userId + ", 'Q', '#EF4444') RETURNING id");

		assertThatThrownBy(() -> jdbc.sql("UPDATE projects SET default_status_id = ? WHERE id = ?")
				.params(todoStatusId, otherProjectId).update())
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void emailMustBeUnique() {
		assertThatThrownBy(() -> insert("INSERT INTO users (name, email, password) VALUES ('別', 'test@example.com', 'hash') RETURNING id"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void colorMustBeHexCode() {
		assertThatThrownBy(() -> jdbc.sql("UPDATE projects SET color = 'blue' WHERE id = ?").param(projectId).update())
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void todayDateAndOrderMustBeSetTogether() {
		assertThatThrownBy(() -> jdbc.sql("UPDATE tasks SET today_date = CURRENT_DATE WHERE id = ?").param(taskId).update())
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void urgencyDefaultsToNormal() {
		String urgency = jdbc.sql("SELECT urgency FROM tasks WHERE id = ?")
				.param(taskId).query(String.class).single();

		assertThat(urgency).isEqualTo("NORMAL");
	}

	@Test
	void urgencyMustBeHighMediumOrNormal() {
		assertThatThrownBy(() -> jdbc.sql("UPDATE tasks SET urgency = 'LOW' WHERE id = ?").param(taskId).update())
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void updatingRowChangesUpdatedAt() {
		// トランザクションの中では now() が変わらないので、わざと古い日時にしてから更新する
		jdbc.sql("UPDATE tasks SET updated_at = '2000-01-01' WHERE id = ?").param(taskId).update();
		jdbc.sql("UPDATE tasks SET title = '変更' WHERE id = ?").param(taskId).update();

		OffsetDateTime updatedAt = jdbc.sql("SELECT updated_at FROM tasks WHERE id = ?")
				.param(taskId).query(OffsetDateTime.class).single();
		assertThat(updatedAt.getYear()).isGreaterThan(2000);
	}

	private long insertStatus(String name, int position) {
		return jdbc.sql("INSERT INTO statuses (project_id, name, position) VALUES (?, ?, ?) RETURNING id")
				.params(projectId, name, position).query(Long.class).single();
	}

	private long insertTask(long projectId, long statusId) {
		return jdbc.sql("INSERT INTO tasks (project_id, status_id, title, position) VALUES (?, ?, 'T', 1) RETURNING id")
				.params(projectId, statusId).query(Long.class).single();
	}

	private long insert(String sql) {
		return jdbc.sql(sql).query(Long.class).single();
	}

	private long count(String table) {
		return jdbc.sql("SELECT count(*) FROM " + table).query(Long.class).single();
	}
}
