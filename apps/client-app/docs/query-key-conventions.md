# queryKey 规范 — 集中 factory 纪律（数据层工程治理 批1 D3）

> 唯一出口：`apps/client-app/src/lib/queryKeys.ts`。全仓 react-query queryKey 只允许经该文件
> 生成（key 常量 / factory / STALE_TIME 表）；消费方 `import` 后使用，**禁止手拼字面量数组**。
> 归零口径：`grep -rn "queryKey: \[" apps/client-app/src apps/client-app/app --include=*.ts --include=*.tsx`
> 仅剩 `queryKeys.ts` 内部与测试断言，其余为 0。

## 段序规范

```
[domain, ...scope, ...params]
```

- 第一段 = 域根（如 `'orders'` / `'products'` / `'cart'` / `'user'`），是前缀失效
  （invalidate/setQueriesData 传根常量）的锚点，**不得在域根前插段**。
- 中段 = 子域/形态（`'detail'` / `'infinite'` / `'counts'` / `'recommend'`…）。
- 尾段 = 业务参数（id / status / offset / cycle / limit / locale…）。

## 必填维度（何时必须进 key）

凡影响后端返回内容的参数必须进 key：id、筛选/排序、分页 offset、语言切片类参数
（后端按 `Accept-Language` 切片的端点，如 search-hot / search-suggest → locale 进 key；
纯透传多语 Record 的数据（批1 A4）**不进** key，渲染层 `localize()` 取值）。
换批/回绕语义需要新缓存隔离时用 `cycle` 段（`PRODUCT_RECOMMEND_INFINITE_KEY`）。

## 前缀 vs 精确匹配纪律（RQ v5 语义）

- `invalidateQueries({ queryKey: ROOT })` / `setQueriesData({ queryKey: ROOT })` =
  **前缀匹配**：命中所有以 ROOT 开头的 key。域根常量（`ORDERS_QUERY_KEY`、
  `NOTIFICATIONS_QUERY_KEY`、`CART_ROOT_KEY`、`REVIEWS_ROOT_KEY`…）就是为前缀失效设计。
- `getQueryData` / `setQueryData` / `cancelQueries`（乐观更新快照）= **精确匹配**：
  必须用完整 factory 产物（如 `orderDetailKey(id)`），不能用根常量——精确匹配非前缀，
  传根常量查不到任何条目。
- **例外警告（勿破坏）**：`UNREAD_COUNT_QUERY_KEY` 与通知列表共享
  `['user','notifications']` 前缀——对通知域做 setQueriesData 必须**逐精确 key**
  （`notificationsListKey(false/true)`），纯前缀匹配会把 number 未读数喂给 `.map()` 崩溃
  （useNotifications.ts 顶部注解）。同款：orders 前缀 setQueriesData 的回调必须有
  `Array.isArray` 守卫（详情是单对象）。
- 精确串失效兼容：`AVAILABLE_COUPONS_KEY`（`['coupons','available-templates']`）刻意与
  卡包 `COUPONS_QUERY_KEY('available')`（`['coupons','available']`）不同根第二段，
  避免互相误伤——新增 coupon 域 key 前先核这段错位。

## invalidate 纪律

1. mutation 写操作 onSettled 至少失效本域根（v5：onSuccess 取消的请求不会跑 invalidate，
   领券类「成败都失效」场景用 onSettled，见 `useClaimCoupon` D17 注释）。
2. 新增 key 必须挂到某个已存在的域根下（或以新域根 + persist.ts `EXCLUDED_PREFIXES`
   评估私有数据是否落盘）。
3. invalidate 用根常量/前缀；不要为了「只刷一条」手拼精确串失效——传
   `orderDetailKey(vars.orderId)` 这类 factory 调用。

## 新增页/新查询接入步骤

1. 在 `src/lib/queryKeys.ts` 对应域段加 key（沿用段序；无对应域则新开域根段落）。
2. `STALE_TIME` 表加档位（批1 原值迁移口径；值依据：变更频率 + 断网价值，
   目录类沿用 `CATALOG_TTL`，价格/库存敏感 ≤5min）。
3. hook 内 `queryKey: XXX_KEY(...)`、`staleTime: STALE_TIME.xxx`，不写裸字面量。
4. 若该域会被 mutation 前缀乐观更新命中，确认回调守卫（数组/对象形态）。
5. 若域根属于登录用户私有数据，检查 `src/services/offline/persist.ts`
   `EXCLUDED_PREFIXES` 是否需要加排除（PII 治理口径）。

## 缓存分级（批2 D14 落档）

`STALE_TIME` 表即分级表（key + 分级单一真源，不另立分级文件），四档口径：

| 档位       | 值                 | 域                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 静态档     | 24h                | 走 RQ 的静态运营数据。**本仓现状无 24h 级 RQ 域**——onboardingSlides 原值 1h，按原值迁移未拔高；档位备而未用，新静态域接入时对齐 24h                                                                                                                                                |
| 目录档     | 沿用 `CATALOG_TTL` | categories 24h / banners 12h / productList 30min / productDetail 10min（catalogPolicy.ts 单源，断网冷启动目录可浏览）                                                                                                                                                              |
| 价格库存档 | 30s                | checkoutPreview / couponValidate / availableCoupons / refundDetail / ticketDetail / orderReviews / notifications（价格/库存/状态敏感，反复进出短缓存）                                                                                                                             |
| 动态短档   | 60s~10min          | recommend / buyAgain / frequentBundle（5min，价格敏感防旧价）/ search 系（60s）/ orders / cart / coupons / reviews / refunds / profile / addresses / payments / favorites / subscriptions / notificationPrefs（60s）/ promotions（10min）/ warehouseAvailability / orderEta（60s） |

**不适用（不进表）**：`app/legal/[type].tsx` 不走 react-query（无 useQuery，纯静态渲染）
——给不存在 RQ 的页写 staleTime 是死配置（D14）。其余非 RQ 数据同理不进表。
另注：全局 queryClient 默认 60s（`src/providers/queryClient.ts:30`）是批1 前既有的
全局基线，**不属域级分级表口径**（本表只记域级档位）。本表口径下「域级 staleTime
字面量 = 0」。无限滚动收编例外（search/product-list/favorites 前提不符）登记见
`docs/offset-infinite-exceptions.md`。

## 消费方 import

key 从 `@/lib/queryKeys` import。旧模块（useCart/useOrders/usePromotion/useFavorites/
useUser/useAddress/usePayment/useRefunds/useReviews/useNotifications）保留了 re-export，
调用方既有 `import { CART_ROOT_KEY } from '@/services/queries/useCart'` 不必改；
**新代码一律从 `@/lib/queryKeys` import**。
