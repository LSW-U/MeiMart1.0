# MeiMart 客户端 App — 审查修复指令（REVIEW-FIXES）

> 审查报告：`MeiMart-三端联调改造审查报告-20260628.md`
> 适用范围：`apps/client-app`
> **按顺序修复，每修完一个 git commit。** commit message 格式：`fix: REVIEW-FIXES #N — 简短描述`

---

## 问题 1（P1）：useOrders.ts 没有用 useInfiniteQuery，无法加载更多

| 项目 | 内容 |
| --- | --- |
| **文件路径** | `src/services/queries/useOrders.ts` |
| **行号** | 第 7–20 行（`useOrders` 定义）；关联调用方 `app/(main)/orders.tsx` 第 24、39、120–132 行 |
| **截止时间** | W6 前 |

### 问题描述

service 层 `orderApi.getOrders(status, cursor, limit)` 已返回游标分页结构 `{ items, nextCursor, hasMore }`（见 `src/services/orders.ts:103–126`），并已支持 `cursor` 入参。但 `useOrders` hook（第 10–20 行）用 `useQuery` 取 `res.items` 后丢弃了 `nextCursor` 和 `hasMore`：

```ts
// 现状（useOrders.ts:10-20）—— 丢弃分页信息
export function useOrders(status?: OrderStatus | 'all') {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, status ?? 'all'],
    queryFn: async () => {
      const res = await orderApi.getOrders(status);
      return res.items;          // ← nextCursor / hasMore 被丢弃
    },
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
  });
}
```

订单列表页 `app/(main)/orders.tsx:39` 调用 `useOrders(active)` 拿到 `Order[]` 喂给 `FlatList`，没有"加载更多"能力，订单超过 20 条时只能看到第一页。

### 修法

1. **保留现有 `useOrders`**（返回 `Order[]`），兼容 `app/order/checkout.tsx` 等不依赖分页的旧调用方，不改动其实现。
2. **新增 `useOrdersInfinite` 导出**，用 `useInfiniteQuery` + `getNextPageParam`，消费 `nextCursor` / `hasMore`。
3. **订单列表页 `app/(main)/orders.tsx` 改用 `useOrdersInfinite`**，FlatList 加 `onEndReached` 触发 `fetchNextPage`，加 `ListFooterComponent` 显示加载指示器。

### 代码示例

#### 2.1 `src/services/queries/useOrders.ts` — 新增 useOrdersInfinite

在文件顶部 import 补入 `useInfiniteQuery`，并在 `useOrders` 之后新增 `useOrdersInfinite`：

```ts
// 顶部 import 改为：
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '@/services/orders';
import type { OrderStatus, Order } from '@/types';

export const ORDERS_QUERY_KEY = ['orders'] as const;

const ORDERS_PAGE_SIZE = 20;

// 保留：兼容不依赖分页的旧组件（返回 Order[]，单页 limit=20）
export function useOrders(status?: OrderStatus | 'all') {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, status ?? 'all'],
    queryFn: async () => {
      const res = await orderApi.getOrders(status);
      return res.items;
    },
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

// 新增：游标分页无限加载 hook，供订单列表页使用
export function useOrdersInfinite(status?: OrderStatus | 'all') {
  return useInfiniteQuery({
    queryKey: [...ORDERS_QUERY_KEY, 'infinite', status ?? 'all'],
    queryFn: ({ pageParam }) => orderApi.getOrders(status, pageParam, ORDERS_PAGE_SIZE),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
  });
}
```

> 说明：`useCreateOrder` / `useCancelOrder` 的乐观更新逻辑中 `setQueriesData` 对 `ORDERS_QUERY_KEY` 的操作仍兼容——它们匹配的是 `['orders', ...]` 前缀，infinite query 的 key 为 `['orders', 'infinite', status]`，也在匹配范围内。但 infinite query 的 data 结构是 `InfiniteData<{items, nextCursor, hasMore}>` 而非 `Order[]`，乐观更新回调里的 `Array.isArray(old)` 判断会安全跳过 infinite query（返回 `old` 不变），不会破坏分页缓存。如需对 infinite query 也做乐观插入，后续可单独扩展，本次不要求。

#### 2.2 `app/(main)/orders.tsx` — 改用 useOrdersInfinite + FlatList 加载更多

```tsx
// 第 24 行 import 改为：
import { useOrdersInfinite } from '@/services/queries/useOrders';

// 第 39 行调用改为：
const {
  data,
  isLoading,
  isError,
  refetch,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useOrdersInfinite(active);

// 将多页 items 拍平为 Order[]
const orders: Order[] = data?.pages.flatMap((p) => p.items) ?? [];

// FlatList（原第 120-132 行）增加 onEndReached + ListFooterComponent：
<FlatList
  data={orders}
  keyExtractor={(item) => item.id}
  contentContainerStyle={styles.list}
  onEndReached={() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }}
  onEndReachedThreshold={0.3}
  ListFooterComponent={
    isFetchingNextPage ? (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    ) : null
  }
  ItemSeparatorComponent={() => (
    <View style={styles.dividerWrap}>
      <TaisDivider />
    </View>
  )}
  renderItem={({ item }: { item: Order }) => (
    <OrderCard order={item} onPress={() => router.push(`/order/${item.id}`)} />
  )}
/>
```

在 `styles` 中补一个 `footerLoading` 样式：

```ts
footerLoading: {
  paddingVertical: spacing.md,
  alignItems: 'center',
},
```

> 注意：空列表判断从 `!orders || orders.length === 0` 保持不变（`orders` 已是拍平后的数组）。`isError` 分支的 `refetch()` 仍有效。

---

## 问题 2（P2）：tsc baseline 错误（双版本 @tanstack/query-core）

| 项目 | 内容 |
| --- | --- |
| **文件路径** | `src/services/offline/persist.ts`（触发点第 14 行）；根因在依赖版本 |
| **行号** | `persist.ts:14`（`queryClient: client,` 处 tsc 报类型不匹配） |
| **截止时间** | W6 前 |

### 问题描述

monorepo 安装了 2 个 `@tanstack/query-core` 版本：

- 根级（被 `@tanstack/react-query-persist-client` 等间接依赖解析）：`5.101.1`
- client-app 直接依赖 `@tanstack/react-query: ^5.101.0` 锁定到：`5.101.0`

两个版本的 `QueryClient` 类型定义不兼容，导致 `persist.ts:14` 处 `persistQueryClient({ queryClient: client, ... })` 报 tsc 类型错误（`client` 来自 `@tanstack/react-query` 的 `QueryClient`，而 `persistQueryClient` 期望另一个版本的 `QueryClient`）。

### 修法

在根 `package.json`（`/Users/linsuwei/code/Work/Temporarily-project/mei-mart-app/package.json`）添加 `resolutions` 字段，统一 `@tanstack/query-core` 版本，然后重新安装依赖。

> 根 package.json 当前只有 `workspaces` 配置，没有 `resolutions`。npm workspaces + yarn 均支持 `resolutions`（yarn 原生；npm 需 `overrides`，但 npm v8+ 也兼容 `resolutions` 作为别名）。**推荐用 `overrides`（npm 原生支持）**，如果用的是 yarn 则用 `resolutions`。

### 代码示例

#### 方案 A（推荐）：根 package.json 加 `overrides`（npm）

```jsonc
// /Users/linsuwei/code/Work/Temporarily-project/mei-mart-app/package.json
{
  "name": "meimart-frontend",
  "private": true,
  "workspaces": [
    "apps/*"
  ],
  "overrides": {
    "@tanstack/query-core": "5.101.1"
  }
}
```

#### 方案 B：根 package.json 加 `resolutions`（yarn）

```jsonc
{
  "name": "meimart-frontend",
  "private": true,
  "workspaces": [
    "apps/*"
  ],
  "resolutions": {
    "@tanstack/query-core": "5.101.1"
  }
}
```

#### 方案 C：client-app/package.json 加 `overrides`（备选）

```jsonc
// apps/client-app/package.json 顶层加：
{
  "name": "mei-mart-app",
  "version": "1.0.0",
  "overrides": {
    "@tanstack/query-core": "5.101.1"
  },
  "main": "index.ts",
  "dependencies": { ... }
}
```

修改后执行（在 monorepo 根目录）：

```bash
rm -rf node_modules apps/client-app/node_modules
npm install   # 或 yarn install
# 验证只剩一个版本：
npm ls @tanstack/query-core   # 应只输出一行 5.101.1
npx tsc --noEmit              # persist.ts:14 类型错误应消失
```

> 版本选择说明：统一到 `5.101.1`（根级间接依赖解析的版本），因为它比 client-app 的 `5.101.0` 更新且满足 `^5.101.0` 范围。如安装后 `npm ls` 显示仍有重复，检查是否有其他包锁定了精确旧版本。

---

## 问题 3（P2）：user.ts /client/me 废弃注释保留

| 项目 | 内容 |
| --- | --- |
| **文件路径** | `src/services/user.ts` |
| **行号** | 第 31 行 |
| **截止时间** | W7 前 |

### 问题描述

`user.ts:31` 注释仍保留"已废弃"字样，容易让后续维护者误以为该端点仍在废弃过渡期：

```ts
// 现状（user.ts:31）：
// Why: /client/me 端点已废弃（后端注释说替换为 /client/user/profile），统一用 profile
async getProfile(): Promise<User> {
```

实际上代码已经统一用 `/client/user/profile`（第 34 行），不存在废弃过渡，注释措辞应更新为正向说明。

### 修法

将第 31 行注释改为"使用 /client/user/profile 获取完整用户信息"，删掉"已废弃"字样。

### 代码示例

```ts
// 修改后（user.ts:31）：
// Why: 使用 /client/user/profile 获取完整用户信息（后端已统一该端点）
async getProfile(): Promise<User> {
  if (isMockMode) return mockResponse(mockDb.user);
  const res = await api.get<ProfileRaw>('/client/user/profile');
  return transformProfile(res.data);
},
```

---

## 验证清单

全部修完后，在 `apps/client-app/` 目录下运行：

```bash
npx tsc --noEmit
npx eslint . --max-warnings 0
```

确认：

- [ ] `tsc --noEmit` 无错误（特别注意 `persist.ts:14` 的双版本类型错误已消失）
- [ ] `eslint` 无警告
- [ ] `useOrdersInfinite` 已导出且 `app/(main)/orders.tsx` 已切换使用
- [ ] `useOrders` 仍保留，旧调用方（`checkout.tsx` 等）不受影响
- [ ] 根 `package.json` 已加 `overrides`/`resolutions`，`npm ls @tanstack/query-core` 只剩一个版本
- [ ] `user.ts:31` 注释不再包含"已废弃"
