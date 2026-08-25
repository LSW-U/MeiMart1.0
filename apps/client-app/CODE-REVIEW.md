# MeiMart Client-App 深度代码审查报告

> **审查日期**: 2026-08-21
> **审查范围**: `apps/client-app/src/` 全部源码 + `app/` 路由页面
> **项目规模**: ~340 源码文件, ~46,700 行代码
> **技术栈**: Expo SDK 56 + React 19.2.3 + RN 0.85.3 + TypeScript 6.0.3 + React Query 5.101 + Zustand 5

---

## 目录

- [总体评价](#总体评价)
- [P0 — 必须修复（Bug / 安全风险）](#p0--必须修复bug--安全风险)
- [P1 — 应当修复（逻辑缺陷 / 数据一致性）](#p1--应当修复逻辑缺陷--数据一致性)
- [P2 — 建议修复（健壮性 / 性能）](#p2--建议修复健壮性--性能)
- [P3 — 工程卫生（代码质量 / 可维护性）](#p3--工程卫生代码质量--可维护性)
- [P4 — 长期演进（架构 / 技术债）](#p4--长期演进架构--技术债)

---

## 总体评价

项目整体架构扎实，技术选型现代且合理。核心亮点：

- ✅ **乐观更新三段式**（onMutate → onError 回滚 → onSettled invalidate）严格贯彻
- ✅ **离线优先架构**（offlineFirst networkMode + persistQueryClient + 离线操作队列）
- ✅ **Token 自动刷新**（单例 promise + pendingQueue 并发排队）
- ✅ **弱网分级降级**（shouldSkipNonEssential / shouldUseLowResImage / shouldDisableAnimation）
- ✅ **TypeScript 严格模式**（strict: true，零 `as any`）
- ✅ **Sentry 隐私脱敏**（beforeSend/beforeBreadcrumb 过滤 token/password）
- ✅ **Material Design 3 色板**（light/dark 完整定义 + 文化装饰色 + 语义色）

以下为逐项审查发现的问题，按严重度分级。

---

## P0 — 必须修复（Bug / 安全风险）

### #001 `payment.ts` — 客户端使用 admin 凭据调用管理接口

**文件**: `src/services/payment.ts` 第 63-79 行

`adminConfirmOrder` 方法通过 `mock-login` 获取 `SUPER_ADMIN` token，然后调用 `/admin/orders/{id}/confirm`。方法本身**没有任何环境检查**，虽然注释说"仅 `__DEV__` 调用"，但该方法是公开的，任何代码路径都可以直接调用。

**风险**: 如果 `mock-login` 端点在生产环境意外可用，普通用户可执行 admin 操作。

**修复建议**: 在方法内部加 `__DEV__` 守卫；或将其移至 dev-only 模块，不导出到 production bundle。

---

### #002 `address.ts` — `updateAddress` 在 real 模式下从 mockDb 读旧地址

**文件**: `src/services/address.ts` 第 104 行

real 模式下 mockDb 数据与后端数据不同步，会用错误的 mock 数据填充未传字段（如 region），导致地址数据被污染。

**修复建议**: 将 mockDb 查找逻辑包裹在 `if (isMockMode)` 内。real 模式应从后端 GET 获取旧地址或由后端做字段合并。

---

### #003 `payment.ts` — `getMethods` 在 real 模式也返回 mock 数据

**文件**: `src/services/payment.ts` 第 12 行

```typescript
async getMethods(): Promise<PaymentMethodView[]> {
  return mockResponse(mockDb.payments); // ← 无论 isMockMode 都返回 mock
}
```

real 模式下支付方式列表永远是 mock 数据，用户会看到错误的支付选项。

**修复建议**: 添加 `if (!isMockMode)` 分支，调用后端 `GET /payments/methods`。

---

### #004 `payment.ts` — `mockPay` 在 real 模式仍调用 `/mock-callback`

**文件**: `src/services/payment.ts` 第 43-45 行

real 模式下调用后端 mock-callback 端点，前端没有环境守卫，会在生产环境发送无意义请求。

**修复建议**: 添加 `if (!isMockMode) return;` 守卫。

---

### #005 `orders.tsx` — 物流追踪路由路径错误

**文件**: `app/(main)/orders.tsx` 第 66 行

```typescript
router.push('/order/${order.id}/tracking')  // ← 错误路径
```

实际路由文件在 `app/order/tracking.tsx`（无 orderId 前缀）。订单详情页用的是正确写法 `router.push({ pathname: '/order/tracking', params: { id: order.id } })`。

**影响**: 订单列表页点击"追踪"会跳转到不存在路由，运行时报错。

**修复建议**: 统一为 `router.push({ pathname: '/order/tracking', params: { id: order.id } })`。

---

### #006 `order/result.tsx` — `goCheckout` 函数跳转目标错误

**文件**: `app/order/result.tsx` 第 158-160 行

```typescript
const goCheckout = () => {
  router.push({ pathname: '/order/[id]', params: { id: orderId } });
};
```

函数名暗示跳转到结算/支付页，但实际跳到订单详情页。待支付态的"立即支付"按钮调用此函数，用户无法完成支付。

**修复建议**: 跳转到支付页面或订单结算页。

---

### #007 `home.tsx` / `cart.tsx` / `categories.tsx` — `/search` 路由不存在

**文件**: `app/(main)/home.tsx` 第 153 行、`app/(main)/cart.tsx` 第 159 行、`app/(main)/categories.tsx` 第 432 行

三处 `router.push('/search')` 指向的路由文件在项目中**完全不存在**。用户点击搜索栏将导致运行时错误。

**修复建议**: 创建 `app/(main)/search.tsx` 页面，或修改路由路径到实际存在的搜索页面。

---

## P1 — 应当修复（逻辑缺陷 / 数据一致性）

### #008 `OfflineBanner` — 硬编码英文文案，accessibilityLabel 却用 t()

**文件**: `src/components/feedback/OfflineBanner/OfflineBanner.tsx` 第 19、29、49 行

```tsx
// Text 内容硬编码英文
<Text>You are offline. Some features may not work.</Text>
<Text>Retry</Text>
<Text>Weak network. Loading may be slower.</Text>

// 但 accessibilityLabel 用了 i18n
accessibilityLabel={t('common.youAreOffline')}
```

视觉文案与 a11y 标签不一致，非英语用户看到英文文案但读屏读的是翻译文案。

**修复建议**: Text 内容也用 `t()` 替换。

---

### #009 `useOfflineMutation` — 在线执行失败不降级入队，操作直接丢失

**文件**: `src/hooks/useOfflineMutation.ts`

当 `net.isConnected` 为 true 但 `onlineHandler` 抛错时（如网络超时），直接返回错误而不降级到离线队列。用户的操作会丢失。此外只检查 `net.isConnected` 但未检查 `net.isInternetReachable`（连了 WiFi 但无网络的情况不会降级）。

**修复建议**: 在 catch 中检查错误类型，对网络类错误降级 `enqueue(op)`。同时检查 `isInternetReachable`。

---

### #010 `format.ts` — `formatDate` 默认 locale='zh-CN'，东帝汶产品不合理

**文件**: `src/utils/format.ts` 第 21 行

东帝汶电商产品默认中文日期格式不合理。且 appStore 默认 locale 是 `'en'`，两处不一致。

**修复建议**: 默认改为 `'en-US'`，或从 appStore 读取当前 locale。

---

### #011 `ThemeProvider` 与 `appStore` 主题状态双源

**文件**: `src/theme/ThemeProvider.tsx` + `src/store/appStore.ts`

`themeMode` 同时存在于 appStore（Zustand persist）和 ThemeProvider（AsyncStorage `@meimart/theme-mode`）。`ThemeProvider.setMode` 只写 AsyncStorage，不更新 appStore，两套持久化机制管理同一概念容易漂移。

**修复建议**: 统一到单一数据源（建议 appStore），ThemeProvider 从 appStore 读写。

---

### #012 `persist.ts` — `shouldDehydrateQuery` 排除 product/products

**文件**: `src/services/offline/persist.ts`

商品数据不持久化，弱网/离线时用户无法查看之前浏览过的商品。与项目"离线优先"的架构目标矛盾。

**修复建议**: 从 denyList 移除 `'product'` 和 `'products'`，或改为只排除 `['auth', 'notifications']`。

---

### #013 `offline/queue.ts` — 无去重机制

**文件**: `src/services/offline/queue.ts`

`enqueue` 简单 push，连续添加同一操作（如多次修改同一商品数量）会累积多条队列项，恢复网络后逐个执行产生冗余请求。

**修复建议**: 入队前检查是否有同 type + 同 entityId 的待执行操作，有则替换而非新增。

---

### #014 `cart.tsx` — `toggleAll` 循环 mutate，N 个 item = N 次请求

**文件**: `app/(main)/cart.tsx` 第 74-80 行

全选 10 个商品 = 10 次网络请求。`deleteSelected` 同理。

**修复建议**: 后端提供批量更新接口，或前端合并为一次请求。

---

### #015 `useOrders` 和 `useOrdersInfinite` 双查询

**文件**: `src/services/queries/useOrders.ts`

两个 hook queryKey 不同，同一 tab 的数据可能被请求两次。

**修复建议**: 统一为一个 hook，内部按需选择分页或全量模式。

---

### #016 `tracking.tsx` — 硬编码英文文案 "ORDER SUMMARY"

**文件**: `app/order/tracking.tsx` 第 323 行

未使用 `t()` 翻译。

---

### #017 `order/result.tsx` — 商品名硬编码 `.en`

**文件**: `app/order/result.tsx` 第 287 行

```tsx
{it.product.name.en}
```

直接取 `.en` 字段，中文/Tetum 用户会看到英文名。应使用 `useLocalizer` 或 `pickLocalized`。

---

### #018 `orderStatusConfig.ts` — label 只有 zh/en，缺 tet

**文件**: `src/lib/orderStatusConfig.ts`

东帝汶本土语言 Tetum（tet）完全缺失，`OrderCard` 的 `pickLabel` 只能 fallback 到 en。

**修复建议**: 为每个状态添加 `tet` 翻译。

---

### #019 `home.tsx` — 消息红点硬编码为 `2`

**文件**: `app/(main)/home.tsx` 第 129 行

消息未读数写死为 2，应从 `useUnreadNotificationCount` 获取。

---

### #020 `promotion.ts` — `claimCoupon` mock fallback 返回错误的券

**文件**: `src/services/promotion.ts` 第 157 行

如果传入的 `promotionId` 不存在，mock 模式默默返回 `mockDb.coupons[0]`，调用方以为领券成功但实际领了错误的券。

**修复建议**: 返回失败或抛错。

---

### #021 `profile/edit.tsx` — `useForm` defaultValues 不会在数据加载后更新

**文件**: `app/profile/edit.tsx` 第 38-46 行

`defaultValues` 使用 `user?.name ?? ''`，但 `useProfile` 异步加载完成后 `user` 变化，`useForm` 的 `defaultValues` 不会自动更新。如果用户打开页面时 profile 还在加载，表单显示空值。

**修复建议**: 用 `useEffect` + `form.reset()` 在数据加载后重置表单。

---

### #022 `uploads.ts` — 不走 axios 401 refresh interceptor

**文件**: `src/services/uploads.ts`

文件上传使用 `fetch` 而非 `axios`，绕过了 401 token 自动刷新机制。上传过程中 token 过期需用户重新登录。

**修复建议**: 在 fetch 响应中检查 401，手动触发 refresh；或使用 axios + manual boundary 处理 FormData。

---

### #023 `tracking.ts` — 硬编码 fallback URL + 无连接错误处理

**文件**: `src/services/tracking.ts` 第 13 行

```typescript
env?.API_BASE_URL ?? 'http://localhost:3000/api/v1'
```

如果 `expoConfig.extra` 未配置，生产环境回退到 localhost。且 `connectOrderTracking` 没有 `on('error')` / `on('connect_error')` 的默认处理。

**修复建议**: 未配置 API_BASE_URL 时抛错而非静默回退；添加默认 error listener。

---

### #024 `reviews.ts` — `getByProduct` 吞掉所有错误

**文件**: `src/services/reviews.ts` 第 147-149 行

```typescript
catch { return { reviews: [], summary: computeSummary([]) }; }
```

任何错误（网络超时、500、权限问题）都被静默吞掉返回空列表，用户不会看到错误提示。

**修复建议**: 区分 404（商品无评论，合理返回空）和其他错误（应抛出或设置 error 状态）。

---

### #025 `address.ts` — mock 模式 `updateAddress` 返回可能为 undefined

**文件**: `src/services/address.ts`

如果 `mockDb.addresses.find` 返回 `undefined`（id 不存在），`Object.assign(undefined, ...)` 会抛错。`return mockResponse(addr as Address)` 会返回 undefined 被 `as Address` 强转，下游使用会崩溃。

---

### #026 `address.ts` — 硬编码帝力坐标作为默认位置

**文件**: `src/services/address.ts`

`DILI_LAT = -8.5569` 和 `DILI_LNG = 125.5603` 硬编码。用户未选地图位置时静默填充默认坐标，可能导致配送地址错误。

**修复建议**: 前端提示用户选择地图位置，而非静默填充。

---

### #027 `authStore.ts` — `setAuth` 的 `void` 调用无错误处理

**文件**: `src/store/authStore.ts`

`void tokenStorage.set(accessToken, refreshToken)` 是 fire-and-forget，如果 SecureStore 写入失败，token 不会被持久化但内存中 `isAuthenticated` 已为 true，重启后用户会被静默登出。

**修复建议**: await 写入并 try-catch，失败时回滚内存状态或提示用户。

---

### #028 `reset-password.tsx` — `sendCode` 缺少 `onError` 回调

**文件**: `app/(auth)/reset-password.tsx` 第 51-57 行

验证码发送失败时无任何用户反馈，而 `register.tsx` 的 `sendCode` 有完整错误处理，体验不一致。

---

### #029 `address/list.tsx` — Native 端 `deleteMutation.mutate` 无 onError 回调

**文件**: `app/address/list.tsx` 第 68 行

删除地址失败时用户无反馈。Web 端分支有 `onError` 但 Native 端没有。

---

### #030 `profile.tsx` — 未登录时仍调用多个数据 hooks

**文件**: `app/(main)/profile.tsx` 第 120-127 行

`useProfile()`、`useCoupons()`、`useFavorites()`、`useOrderCounts()` 在未登录时也会执行，可能触发不必要的请求或返回错误。

---

## P2 — 建议修复（健壮性 / 性能）

### #031 `api.ts` — 生产 HTTPS 检查仅 console.error 不阻止

**文件**: `src/services/api.ts`

生产环境检测到 HTTP（非 HTTPS）时仅 `console.error`，不阻止请求发送。敏感信息（如 token）可能通过明文 HTTP 传输。

**修复建议**: 生产环境检测到 HTTP 时抛错或拒绝请求。

---

### #032 `api.ts` — `sanitizeLogPayload` 只做浅拷贝

**文件**: `src/services/api.ts`

嵌套对象中的敏感字段（如 `user.password`、`order.payment.token`）不会被脱敏。

**修复建议**: 实现深度递归脱敏，或使用 JSON.parse/stringify + 字段过滤。

---

### #033 `cache.ts` — `getCacheSize` 用字符串长度近似字节数

**文件**: `src/services/cache.ts`

`JSON.stringify(value).length` 返回字符数，但 JavaScript 使用 UTF-16 编码，非 ASCII 字符占 2 字节，估算不准确。

---

### #034 `geocode.ts` — 直接调 OSM 第三方 API，无速率限制/缓存/超时降级

**文件**: `src/services/geocode.ts`

OSM Nominatim 有严格的速率限制（1 次/秒），当前代码无 rate limiter、无结果缓存、无超时降级。高频调用会被 OSM 封禁。

**修复建议**: 添加本地缓存（地址 → 坐标映射）、请求节流、超时 fallback。

---

### #035 `searchSuggest.ts` — real 模式传原始 prefix 而非 normalizedPrefix

**文件**: `src/services/searchSuggest.ts` 第 49 行

mock 模式用 `normalizedPrefix`（小写 + trim），real 模式用原始 `prefix`，行为不一致。大写字母或前后空格会导致 mock/real 结果不同。

---

### #036 `promotion.ts` — mock 的 `validate` 不处理 FREE_DELIVERY 类型

**文件**: `src/services/promotion.ts`

`adaptMockCoupon` 的 `typeMap` 只映射 `fixed` 和 `percentage`，缺少 `free_delivery` → `FREE_DELIVERY`。mock 数据中的免运费券会被映射为 `FIXED_AMOUNT`，折扣计算错误。

---

### #037 `catalog.ts` — Banner 未按 sortOrder 排序，linkType/linkValue 信息丢失

**文件**: `src/services/catalog.ts`

`transformBanner` 只映射了 `id`、`image`、`title`，丢弃了 `linkType`、`linkValue`、`sortOrder`。Banner 无法点击跳转，顺序也不确定。

---

### #038 `favorites.ts` — mock toggle 不添加收藏

**文件**: `src/services/favorites.ts` 第 55-56 行

mock 模式下取消收藏有效，但添加收藏不会真正添加到列表。用户添加收藏后刷新看不到新收藏。

---

### #039 `user.ts` — mock 模式 `Object.assign(mockDb.user, updates)` 字段名不一致

**文件**: `src/services/user.ts`

前端 `User` 类型字段名（如 `avatar`）与后端不同（`avatarUrl`），但 mock 模式直接 assign 前端字段名到 mockDb.user，导致下次 `getProfile` 返回的数据结构不一致。

---

### #040 `SafeImage` — `hasError` 状态不随 source 变化重置

**文件**: `src/components/ui/SafeImage/SafeImage.tsx`

当 `source` prop 变化（如列表复用）时，`hasError` 仍为 true，新图片也会显示 fallback。

**修复建议**: 使用 `useEffect` 在 source 变化时重置 `hasError`。

---

### #041 `Skeleton` — 动画不尊重弱网/减少动画偏好

**文件**: `src/components/ui/Skeleton/Skeleton.tsx`

使用 `Animated.loop` 无限动画，未使用 `useWeakNetworkUI` 的 `shouldDisableAnimation`。

---

### #042 `Button` — `minHeight: 44` 与 `SIZE_HEIGHT.sm: 36` 冲突

**文件**: `src/components/ui/Button/Button.tsx`

sm 按钮设置 height=36，但 `styles.base` 有 `minHeight: 44`，sm 按钮实际高度为 44 而非 36。

---

### #043 `address/list.tsx` — FlatList 嵌套在 ScrollView 中

**文件**: `app/address/list.tsx` 第 209 行

`FlatList` 设 `scrollEnabled={false}` 嵌套在外层 `ScrollView` 中，所有地址卡片一次性渲染（失去虚拟化优势），地址数量多时性能差。

---

### #044 `orders.tsx` — `ItemSeparatorComponent` 用内联箭头函数

**文件**: `app/(main)/orders.tsx` 第 222-226 行

每次渲染创建新组件实例，应提取为静态组件。

---

### #045 `appStore.ts` — networkStatus 每次 NetInfo 事件都 set

**文件**: `src/store/appStore.ts`

每次 NetInfo 事件都 `set({ networkStatus })`，高频触发可能导致不必要的 re-render。

**修复建议**: 对比新旧值，仅在变化时 set。

---

### #046 `tracking.ts` — reconnectionAttempts 硬编码为 5，无降级通知

**文件**: `src/services/tracking.ts`

5 次重连后永久放弃，没有暴露给调用方配置，也没有降级通知机制。

---

### #047 `orders.tsx` / `[id].tsx` / `tracking.tsx` — 大量代码重复

**文件**: `app/order/[id].tsx` + `app/order/tracking.tsx`

`Header` 组件、`Timeline` 组件、商品列表渲染、地址卡片、费用摘要等在两个文件中几乎完全相同。

**修复建议**: 抽取为共享组件（`OrderHeader`、`OrderTimeline`、`OrderItemSummary`）。

---

### #048 `address/edit.tsx` — `MotifTriangle` 组件重复定义

**文件**: `app/address/edit.tsx` 第 610-626 行 + `app/address/list.tsx` 第 296-312 行

完全相同的组件在两个文件中各定义一次，应抽取为共享组件。

---

### #049 `pickLocalized` 函数在 4+ 个 service 文件中重复实现

**文件**: `notifications.ts`、`catalog.ts`、`reviews.ts`、`cart.ts`、`products.ts`、`orders.ts` 等

每个 service 各有一份几乎相同的 `pickLocalized` 实现。

**修复建议**: 提取到 `src/utils/i18n.ts` 作为共享工具函数。

---

### #050 `auth.ts` — `mockLogin` 无环境保护

**文件**: `src/services/auth.ts`

`mockLogin` 方法没有 `__DEV__` 守卫，虽然后端应拒绝，但前端应有防御性检查。

---

## P3 — 工程卫生（代码质量 / 可维护性）

### #051 `home.tsx` / `cart.tsx` — 残留未使用样式

**文件**: `app/(main)/home.tsx`（10+ 个未使用样式）、`app/(main)/cart.tsx`（8+ 个未使用样式）

注释说明已替换为 `MasonryProductCard` / `SmallProductCard` 组件，但旧样式未清理。

---

### #052 `formatPrice` 不支持千分位

**文件**: `src/utils/format.ts`

`$1234.50` 而非 `$1,234.50`。且 `PriceText` 组件内有一份重复的 `formatPrice` 实现，参数语义不同。

**修复建议**: 统一到 `utils/format.ts`，使用 `Intl.NumberFormat` 支持千分位。

---

### #053 `eslint` 规则偏薄

**文件**: `eslint.config.js`

仅 expo 默认配置 + jest globals + scripts Node.js globals，缺少 `import/order`、`no-unused-vars`、`no-floating-promises` 等常用规则。

---

### #054 多个 UI 组件硬编码英文 a11y label

**文件**: `Badge.tsx`、`PriceText.tsx`、`Checkbox.tsx`、`SelectField.tsx`、`Modal.tsx`、`Icon.tsx`

- `Badge`: `'New notification'` / `'${count} notifications'`
- `PriceText`: `Price ${...}` / `original ${...}`
- `Checkbox`: `'Checkbox'`
- `SelectField`: `'Select'` / `Select ${label}, current ${value}`
- `Modal`: `"Tap outside to close"`
- `Icon`: 默认 `color = '#000'`

---

### #055 `order/[id].tsx` / `orders.tsx` / `tracking.tsx` / `checkout.tsx` — 硬编码 `ON_PRIMARY = '#ffffff'`

4 个文件各自硬编码 `const ON_PRIMARY = '#ffffff'`，应使用主题 `colors['on-primary']`。

---

### #056 `order/result.tsx` — 硬编码颜色值不适配 dark mode

**文件**: `app/order/result.tsx` 第 508、519、549 行

`borderBottomColor: '#e0e0e0'`、`borderTopColor: '#e0e0e0'`、`backgroundColor: '#ffffff'` 在 dark mode 下不会自适应。

---

### #057 `profile.tsx` — 默认头像 URL 硬编码且极长

**文件**: `app/(main)/profile.tsx` 第 34-35 行

Google CDN 超长 URL 硬编码在代码中，应使用本地静态资源。

---

### #058 `profile.tsx` — `getCount` 类型不安全

**文件**: `app/(main)/profile.tsx` 第 126-127 行

```typescript
const getCount = (id: string): number =>
  (orderCounts as Record<string, number | undefined>)[id] ?? 0;
```

使用 `as Record<string, ...>` 强制类型转换绕过类型检查。

---

### #059 `categories.tsx` — 使用原生 `Image` 而非 `SafeImage`

**文件**: `app/(main)/categories.tsx` 第 393 行

侧栏分类图片使用原生 `Image`，而项目其他地方使用 `SafeImage` 组件统一处理图片加载错误。

---

### #060 `checkout.tsx` — 大量使用 `${...}` 拼接美元符号而非 `formatPrice`

**文件**: `app/order/checkout.tsx` 第 407、423、430、453、465、512 行等

结算页大量使用模板字符串拼接美元符号，未使用 `formatPrice` 工具函数，无法随 locale 切换货币格式。

---

### #061 `register.tsx` — `inviteCode` 字段定义但未使用

**文件**: `app/(auth)/register.tsx` 第 61 行

`defaultValues` 中包含 `inviteCode`，但表单中没有对应的 `FormInput`，该字段永远不会被填入。

---

### #062 `(main)/_layout.tsx` — Tab 切换用 `router.push` 累积导航历史

**文件**: `app/(main)/_layout.tsx` 第 21 行

```typescript
onTabPress={(tab) => router.push(TAB_ROUTES[tab])}
```

Tab 切换使用 `push` 会累积导航历史，用户按返回键会逐个回退 tab 而非退出 app。应考虑使用 `router.replace` 或 Expo Router 的 tab 导航方法。

---

### #063 `(auth)/_layout.tsx` — 缺少错误边界

**文件**: `app/(auth)/_layout.tsx`

auth 路由组没有包裹任何错误边界，login/register/reset-password 页面渲染出错将直接冒泡到根 ErrorBoundary。`categories.tsx` 同样缺少 `PageErrorBoundary`。

---

### #064 `address/edit.tsx` — `FieldProps` 定义了 `keyboardType` 但未传入 `TextInput`

**文件**: `app/address/edit.tsx` 第 456 行

`FieldProps` 定义了 `keyboardType` 属性，但 `Field` 组件的解构中未取出 `keyboardType`，也没有传递给 `TextInput`。

---

### #065 多个页面缺少 Web 端操作确认

**文件**: `cart.tsx`（批量删除）、`tracking.tsx`（取消订单）、`address/list.tsx`（删除地址）

Web 端直接执行删除/取消操作无确认弹窗，而 Native 端有 `Alert.alert` 确认，体验不一致且存在误操作风险。

---

### #066 `profile.tsx` — 登出无确认弹窗

**文件**: `app/(main)/profile.tsx` 第 164-167 行

`clearAuth()` 直接执行，没有二次确认。

---

## P4 — 长期演进（架构 / 技术债）

### #067 NativeWind 已装未用

**文件**: `package.json`（`nativewind ^4.2.5`）+ `tailwind.config.js`

NativeWind + Tailwind CSS 已安装配置，但实际全部使用 `StyleSheet`。要么激活使用，要么移除依赖减少 bundle 体积。

---

### #068 mock/real 分支散落在各 service 文件

**文件**: 所有 `src/services/*.ts`

每个 service 文件内部都有 `if (isMockMode)` 分支，mock 逻辑与 real 逻辑耦合。新增 service 需要同时维护两套逻辑。

**修复建议**: 考虑将 mock 实现提取到独立的 `src/services/mock/*.ts` 文件，通过统一接口注入。

---

### #069 无性能监控

项目使用了 Sentry 做错误监控，但没有性能监控（如 Sentry Performance / React Profiler / Flipper）。无法感知页面加载时间、列表滚动卡顿等性能问题。

---

### #070 测试覆盖不均

UI 组件测试较充分，但 `services/` 和 `services/queries/` 层测试薄弱。关键逻辑如 token refresh、乐观更新回滚、离线队列处理缺乏单元测试。

---

### #071 `onboarding.ts` — 纯占位文件无实际实现

**文件**: `src/services/onboarding.ts`

只有类型定义 + TODO 注释，没有实际 API 调用。如果引用方直接使用这些类型期望有 API 方法，会得到 `undefined`。

**修复建议**: 至少导出一个空的 `onboardingApi` 对象或抛 "not implemented" 错误。

---

### #072 `authStore.ts` — Zustand persist 包装冗余

**文件**: `src/store/authStore.ts`

`partialize: () => ({})` 让 Zustand persist 实际不持久化任何字段，但 persist 中间件仍会在 AsyncStorage 中创建空的 `auth-storage` 键。既然 token 唯一来源是 `tokenStorage`，可以去掉 persist 包装。

---

### #073 `appStore.ts` — 瞬态状态与持久状态混用

**文件**: `src/store/appStore.ts`

`networkStatus`、`pendingMutations`、`networkRestoredAt` 是瞬态运行时状态，与需要持久化的 `locale`/`themeMode`/`onboardingCompleted` 放在同一个 store 中。虽然 `partialize` 正确区分了，但增加了认知负担。

---

## 统计汇总

| 严重度 | 数量 | 说明 |
|--------|------|------|
| **P0** | 7 | Bug / 安全风险，必须修复 |
| **P1** | 23 | 逻辑缺陷 / 数据一致性，应当修复 |
| **P2** | 20 | 健壮性 / 性能，建议修复 |
| **P3** | 16 | 工程卫生 / 代码质量 |
| **P4** | 7 | 长期演进 / 架构技术债 |
| **合计** | **73** | |

### 按模块分布

| 模块 | 问题数 | 主要问题类型 |
|------|--------|-------------|
| `src/services/` | 25 | mock/real 分支泄漏、字段映射丢失、错误吞掉 |
| `app/` 路由页面 | 22 | 路由错误、硬编码文案、代码重复、未使用样式 |
| `src/components/ui/` | 8 | 硬编码 a11y label、状态不重置、样式冲突 |
| `src/hooks/` | 3 | 离线降级缺失、网络检测不全 |
| `src/store/` | 4 | 双源状态、持久化冗余、错误处理缺失 |
| `src/theme/` | 2 | 双源主题管理、对比度待验证 |
| `src/utils/` | 3 | locale 默认值、千分位缺失、重复实现 |
| `src/lib/` | 1 | i18n 缺 tet |
| 工程配置 | 5 | eslint 偏薄、NativeWind 未用、测试覆盖不均 |

---

## 建议的修复优先级

### 第一优先（P0，立即修复）

1. `payment.ts` 的 admin 凭据安全问题（#001-#004）
2. `address.ts` 的 real 模式 mockDb 污染（#002）
3. 路由路径错误（#005、#006、#007）

### 第二优先（P1 高影响，本迭代修复）

4. `OfflineBanner` 硬编码文案（#008）
5. `useOfflineMutation` 操作丢失（#009）
6. `formatDate` 默认 locale（#010）
7. `persist.ts` 商品不持久化（#012）
8. `orderStatusConfig` 缺 tet（#018）
9. `uploads.ts` 401 不刷新（#022）

### 第三优先（P1-P2，下个迭代）

10. 主题双源统一（#011）
11. 离线队列去重（#013）
12. 购物车批量操作（#014）
13. 订单页面代码重复抽取（#047）
14. `pickLocalized` 统一（#049）

### 持续改进（P3-P4）

15. 清理未使用样式（#051）
16. 强化 eslint 规则（#053）
17. UI 组件 a11y i18n（#054）
18. 决定 NativeWind 去留（#067）
19. 补充 service/queries 层测试（#070）

###