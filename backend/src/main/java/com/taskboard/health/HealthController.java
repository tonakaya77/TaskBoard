package com.taskboard.health;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 動作確認用。アプリとデータベースの両方が動いているかを返す。
 */
@RestController
public class HealthController {

	private final HealthMapper healthMapper;

	public HealthController(HealthMapper healthMapper) {
		this.healthMapper = healthMapper;
	}

	@GetMapping("/api/health")
	public Map<String, String> health() {
		return Map.of(
				"status", "ok",
				"database", healthMapper.selectVersion());
	}
}
