package com.taskboard;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

// テスト用の PostgreSQL を Testcontainers で起動する。
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class TaskBoardApplicationTests {

	@Test
	void contextLoads() {
	}

}
