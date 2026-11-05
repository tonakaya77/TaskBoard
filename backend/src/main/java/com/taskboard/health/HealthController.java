package com.taskboard.health;

import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
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

	@Mapper
	public interface HealthMapper {

		@Select("SELECT version()")
		String selectVersion();
	}
}
