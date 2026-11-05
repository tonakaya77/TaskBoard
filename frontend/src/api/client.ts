/** API を呼んで JSON を返す。成功（2xx）でなければ例外にする。 */
export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`API の呼び出しに失敗しました（${res.status}）: ${path}`)
  }
  return (await res.json()) as T
}
