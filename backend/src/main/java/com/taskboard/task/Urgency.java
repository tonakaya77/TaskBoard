package com.taskboard.task;

/**
 * タスクの緊急度。tasks.urgency にこの名前のまま文字で保存する（docs/database.md）。
 * 画面では、高は赤、中は黄で表示し、通常は何も出さない（docs/functions.md の F-11）。
 */
public enum Urgency {
	/** 高 */
	HIGH,
	/** 中 */
	MEDIUM,
	/** 通常 */
	NORMAL
}
