package com.taskboard.health;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface HealthMapper {

	/** PostgreSQL のバージョンを返す。つながっていなければ例外になる。 */
	@Select("SELECT version()")
	String selectVersion();
}
