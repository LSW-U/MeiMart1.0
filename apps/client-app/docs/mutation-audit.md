# Mutation 完整性审计

> 初次扫描：2026-06-15（Task B.5）
> 最近重审：**2026-07-24**（全量精确重审，逐个 mutation 读代码核实，修正了 grep 误报）
> 范围：`src/services/queries/use*.ts`（11 个文件，其中 7 个含 mutation）
> 评判规则：CLAUDE.md 规则 #25 — "用户点击后期望立即视觉反馈的写操作，必须有 onMutate；纯异步操作（登录/注册/发码）可豁免"

---

## 重审结论：全部合规 ✅

2026-07-24 全量重审，7 个含 mutation 的文件、**19 个 mutation 全部合规**。代码较 06-20 不但没回退，createOrder / updateProfile 还补齐了乐观更新（见 §变化）。

## 总览

| 文件 | mutation 数 | 有 onMutate | 豁免 | 状态 |
|---|---|---|---|---|
| useAuth.ts | 5 | 0 | 5（全异步）| ✅ |
| useCart.ts | 4 | 4 | 0 | ✅ |
| useAddress.ts | 4 | 4 | 0 | ✅ |
| useOrders.ts | 2 | 2 | 0 | ✅ |
| useNotifications.ts | 2 | 2 | 0 | ✅ |
| useFavorites.ts | 1 | 1 | 0 | ✅ |
| useUser.ts | 1 | 1 | 0 | ✅ |
| **合计** | **19** | **14** | **5** | — |

无 mutation 的纯 query 文件：`useCatalog` / `usePayment` / `useProducts` / `useTracking`。

---

## ⚠️ grep 脚本误报教训（重要）

CLAUDE.md 规则 26 的检查脚本用 `grep -c "useMutation"` 计数，会把第 1 行 `import { useMutation }` 也算进去，**导致每个文件 useMutation 数恒比实际多 1**。配合 `grep -c "onMutate"`（这个只数实现，但会误匹配注释里的字样，如 useAuth 文件头"不实现 onMutate"），脚本一度呈现"7 个文件 useMutation > onMutate"的**覆盖率回退假象**。

**正确做法**：grep 计数仅用于初筛，合规判定必须读代码确认每个 mutation 的用途与三件套实现。本次重审即修正了该误报。

> 建议后续把规则 26 脚本改成 `grep -cE "^\s*useMutation\("` 只数调用处，或直接基于 AST。

---

## vs 旧版（06-20）的变化

| 变化 | 说明 |
|---|---|
| `useFavorites.ts` 新增 | 从 useUser 拆出，`useToggleFavorite` 有完整三件套 |
| `useNotifications.ts` 新增 | 从 useUser 拆出，含 `useMarkNotificationRead`（旧版在 useUser）+ 新增 `useMarkAllNotificationsRead`，都有三件套 |
| `useCreateOrder` 升级 | 旧版豁免（仅 onSuccess invalidate）→ **新版补 onMutate**，乐观插入临时订单避免列表空白闪现 |
| `useUpdateProfile` 升级 | 旧版豁免 → **新版补 onMutate**，乐观更新 profile 缓存 |

---

## 逐文件明细

### useAuth.ts（5，全豁免）

`useLoginPassword` / `useLoginSms` / `useRegister` / `useSendSmsCode` / `useResetPassword` —— 纯异步操作，提交后不更新任何列表，调用方在 onSuccess 后跳转。文件头有豁免说明注释（规范）。

### useCart.ts（4，全有三件套）

`useAddToCart` / `useUpdateCartItem` / `useRemoveCartItem` / `useToggleCartItem` —— 购物车写操作，全部乐观更新 + `recomputeTotals` 重算 totalItems/totalPrice。

### useAddress.ts（4，全有三件套）

`useCreateAddress`（临时 id 追加）/ `useUpdateAddress`（merge）/ `useDeleteAddress`（filter）/ `useSetDefaultAddress`（`enforceSingleDefault` 互斥切默认）。

### useOrders.ts（2，全有三件套）

- `useCreateOrder`：onMutate 乐观插入临时订单（tempId + orderNo），onSuccess 用真实 Order 替换 tempId，onError 回滚。避免下单后跳列表时空白闪现。
- `useCancelOrder`：onMutate 立即把 status 改为 `CANCELLED`，`setQueriesData` 同步所有状态变体（all/pending/paid/...）。

### useNotifications.ts（2，全有三件套）

`useMarkNotificationRead`（标记单条 + 未读数 -1）/ `useMarkAllNotificationsRead`（全标已读 + 未读数归零）。

### useFavorites.ts（1，有三件套）

`useToggleFavorite`：乐观加入/移除，复用组件传入的 product 对象（已含完整字段）避免额外 fetch。

### useUser.ts（1，有三件套）

`useUpdateProfile`：onMutate merge updates 到 PROFILE_QUERY_KEY 缓存。

---

## 验收

- 7 个含 mutation 文件全部合规 ✅
- 19 个 mutation：14 个有 onMutate + 5 个合规豁免 ✅
- 无 mutation 的 4 个 query 文件无需检查 ✅
- CP3 mutation 覆盖率检查通过 ✅
