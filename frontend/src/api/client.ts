/** API を呼んで JSON を返す。成功（2xx）でなければ例外にする。 */
export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`API の呼び出しに失敗しました（${res.status}）: ${path}`)
  }
  return (await res.json()) as T
}

/** API に JSON を送って、返ってきた JSON を返す。成功（2xx）でなければ例外にする。 */
async function sendJson<T>(
  method: 'POST' | 'PUT',
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`API の呼び出しに失敗しました（${res.status}）: ${path}`)
  }
  return (await res.json()) as T
}

/** API に JSON を POST して、返ってきた JSON を返す。 */
export function postJson<T>(path: string, body: unknown): Promise<T> {
  return sendJson<T>('POST', path, body)
}

/** API に JSON を PUT して、返ってきた JSON を返す。 */
export function putJson<T>(path: string, body: unknown): Promise<T> {
  return sendJson<T>('PUT', path, body)
}

/** API に DELETE を送る。返事の本文（204 なので空）は読まない。成功（2xx）でなければ例外にする。 */
export async function deleteRequest(path: string): Promise<void> {
  const res = await fetch(path, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(`API の呼び出しに失敗しました（${res.status}）: ${path}`)
  }
}
