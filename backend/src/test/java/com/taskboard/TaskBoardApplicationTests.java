package com.taskboard;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

// データベースを使い始めたら @Import(TestcontainersConfiguration.class) を付け、
// テスト用の PostgreSQL を起動する。
@SpringBootTest
class TaskBoardApplicationTests {

	@Test
	void contextLoads() {
	}

}
