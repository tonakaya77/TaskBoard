import type { Status, Task } from '../api/types'

// テスト用のデータを作る。必要な項目だけ上書きする。

export function makeStatus(overrides: Partial<Status> = {}): Status {
  return {
    id: 1,
    projectId: 1,
    name: '未着手',
    position: 1,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    projectId: 1,
    statusId: 1,
    title: 'タスク',
    description: null,
    dueDate: null,
    urgency: 'NORMAL',
    position: 1,
    todayDate: null,
    todayOrder: null,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...overrides,
  }
}
