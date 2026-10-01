/**
 * @meimart/nav-core — MeiMart1.0 跨端安全导航核心（跨端基建统一 批3 A6，M6 蓝本）
 *
 * 单源共享：SAFE_ID_PATTERN + safeRoutePush（非法 id 降级不报错）。
 * 蓝本：rider utils/safe-deep-link.ts（不可信入口的 link 不得直接拼 router.push——
 * 白名单限定字符集防 `/order/../...`、`%` 编码、超长注入）。
 *
 * 类型说明：expo-router Href 是 app 侧 TypedRoutes 产物，本包不依赖 expo-router，
 * push 回调用泛型注入（app 侧传 `router.push` 即得完整类型收窄；包内保持 `unknown`
 * 调用面以免把 TypedRoutes 类型依赖拉进共享包）。
 */

/** 动态段 id 白名单：字母/数字/连字符，1~40 位（rider safe-deep-link.ts 现值原样上收） */
export const SAFE_ID_PATTERN = /^[A-Za-z0-9-]{1,40}$/;

/** push 回调最小接口（结构化子类型，app 侧直接传 expo-router 的 router.push 兼容） */
export type RoutePusher = (href: string) => void;

/**
 * 安全校验动态段 id 后 push `basePath/{id}`；非法 id 降级不报错（不导航、不抛异常）。
 *
 * Why 不在调用方拼模板字符串：拼装点散落时白名单校验必漏（client 122 处 router.push
 * 实测）；统一入口让不可信入口的路径拼装只有一条管道可审计。
 *
 * 裁决依据（批3 审查 P3-2 修订，与 16 处直推裁决对齐）：
 *   - 不可信入口（推送/深链 payload）——强制走本白名单校验；
 *   - 可信内存数据源（typed 对象，如 items.map(item.id)）——豁免，直接 router.push。
 *
 * @param push   导航回调（app 侧传 router.push）
 * @param basePath 已知安全前缀（本仓静态字符串，如 '/order'、'/product'；不接受用户输入）
 * @param id     动态段 id（来源为不可信入口时必须校验；可信内存数据源豁免）
 */
export function safeRoutePush(push: RoutePusher, basePath: string, id: unknown): void {
  if (typeof id !== 'string' || !SAFE_ID_PATTERN.test(id)) return;
  push(`${basePath}/${id}`);
}
