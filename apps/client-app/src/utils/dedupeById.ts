/**
 * 按 id 顺序保留去重（首次出现优先）。
 *
 * Why: 后端 offset 分页在排序不稳定时（salesCount 并列无 tie-breaker）跨页会返回重复
 *   行，flatMap 拼接后同 id 渲染两次 → React duplicate key 告警（home 20261023 实证）。
 *   原三处消费方（home/orders/search results）各写一份 Set+filter 逗号表达式（审查 Q4），
 *   收敛到此 util；根治靠后端 ORDER BY tie-breaker（后端配合项）。
 */
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}
