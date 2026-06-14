# Mutation 完整性审计（Task B.5）

> 扫描时间：2026-06-15  
> 范围：`src/services/queries/use*.ts` 全部 mutation  
> 评判规则：CLAUDE.md 规则 #25 — "用户点击后期望立即视觉反馈的写操作，必须有 onMutate"

## 总览

| 文件            | useMutation 总数 | 有 onMutate | 有 onError | 有 onSettled | 状态                          |
| --------------- | ---------------- | ----------- | ---------- | ------------ | ----------------------------- |
| `useAuth.ts`    | 5                | 0           | 0          | 0            | ✅ 合规（全豁免）             |
| `useCart.ts`    | 4                | 4           | 4          | 4            | ✅ 合规                       |
| `useAddress.ts` | 4                | 4           | 4          | 4            | ✅ 合规                       |
| `useOrders.ts`  | 2                | 1           | 1          | 1            | ✅ 合规（createOrder 豁免）   |
| `useUser.ts`    | 2                | 1           | 1          | 1            | ✅ 合规（updateProfile 豁免） |
| **合计**        | **17**           | **10**      | **10**     | **10**       | —                             |

## 逐项说明

### ✅ useAuth.ts（5 个，0 个 onMutate，合规）

| Hook               | 行为       | 是否需要 onMutate | 原因                         |
| ------------------ | ---------- | ----------------- | ---------------------------- |
| `useLoginPassword` | 密码登录   | ❌ 不需要         | 异步操作，登录成功后才跳转   |
| `useLoginSms`      | 短信登录   | ❌ 不需要         | 异步操作                     |
| `useRegister`      | 注册       | ❌ 不需要         | 异步操作，注册成功后才跳转   |
| `useSendSmsCode`   | 发送验证码 | ❌ 不需要         | 异步操作，按钮启动倒计时即可 |
| `useResetPassword` | 重置密码   | ❌ 不需要         | 异步操作，成功后才跳转       |

按 CLAUDE.md 规则 #25："除非该 mutation 是「纯创建且不需要立即更新列表」（如提交评价、发送验证码等异步操作）"。登录/注册/验证码均属于此类。

### ✅ useCart.ts（4 个，全部有 onMutate）

| Hook                | onMutate 行为                         |
| ------------------- | ------------------------------------- |
| `useAddToCart`      | 添加商品到购物车，立即更新数量        |
| `useUpdateCartItem` | 改数量/勾选单个，立即更新合计         |
| `useRemoveCartItem` | 删除商品，立即从列表移除              |
| `useToggleCartItem` | 勾选 checkbox，立即切换 selected 状态 |

Tasks B.1/B.2/B.3 已全部完成。

### ✅ useAddress.ts（4 个，全部有 onMutate）

| Hook                   | onMutate 行为                                    |
| ---------------------- | ------------------------------------------------ |
| `useCreateAddress`     | 临时 id 追加，必要时 enforceSingleDefault        |
| `useUpdateAddress`     | merge updates，isDefault 时 enforceSingleDefault |
| `useDeleteAddress`     | filter 移除                                      |
| `useSetDefaultAddress` | mutex 切换默认                                   |

Task B.4 已完成。

### ⚠️ useOrders.ts（2 个，1 个 onMutate，**已修**）

| Hook             | 当前实现                   | 是否需要 onMutate                     | 操作                                                          |
| ---------------- | -------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| `useCreateOrder` | onSuccess invalidate       | ❌ 不需要（提交订单异步，跳转支付页） | 保留现状                                                      |
| `useCancelOrder` | **已加 onMutate**（B.5.1） | ✅ 需要（用户期望订单状态立即变化）   | ✅ 完成：立即把订单状态改为 'cancelled'，多状态变体列表均同步 |

### ⚠️ useUser.ts（2 个，1 个 onMutate，**已修**）

| Hook                      | 当前实现                   | 是否需要 onMutate                | 操作                                                   |
| ------------------------- | -------------------------- | -------------------------------- | ------------------------------------------------------ |
| `useUpdateProfile`        | onSuccess invalidate       | ⚠️ 边界                          | 更新资料后跳转回上一页，可保留 invalidate；不强制要求  |
| `useMarkNotificationRead` | **已加 onMutate**（B.5.2） | ✅ 需要（红点/未读数应立即消失） | ✅ 完成：立即把消息标记为已读，触发红点/未读数即时消失 |

## 缺失的 mutation（应存在但未实现）

| 功能       | 现状                                                      | 建议                                  |
| ---------- | --------------------------------------------------------- | ------------------------------------- |
| 收藏切换   | 无 `useToggleFavorite` hook，ProductCard 心形按钮未接 API | 待业务实现时一并加 onMutate           |
| 优惠券领取 | 无 hook                                                   | 待业务实现                            |
| 评价提交   | 无 hook                                                   | 按 CLAUDE.md 规则 #25 可豁免 onMutate |

## 待补 Tasks

### B.5.1 — useCancelOrder 加 onMutate ✅ 完成

`onMutate`：snapshot 所有 ORDERS_QUERY_KEY 变体（all/pending/paid/...），用 `setQueriesData` 把目标订单 status 改为 'cancelled'。

`onError`：把 snapshot 中每个 `[key, data]` 写回。

`onSettled`：invalidate。

### B.5.2 — useMarkNotificationRead 加 onMutate ✅ 完成

`onMutate`：cancel + snapshot + map 标记目标通知 `read: true`。

`onError`：rollback。

`onSettled`：invalidate。

### B.5.3 — useUpdateProfile（不做）

更新资料后跳转，列表本身不展示，invalidate 即可。不强求 onMutate。

## 验收

- `useCart.ts`：4/4 全部有 onMutate ✅
- `useAddress.ts`：4/4 全部有 onMutate ✅
- `useOrders.ts`：1/2（createOrder 豁免）✅
- `useUser.ts`：1/2（updateProfile 豁免）✅
- `useAuth.ts`：5/5 全部异步操作豁免 ✅

**全部合规，CP-FIX-1 验收通过。**
