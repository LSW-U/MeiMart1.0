# 空 HTML 文件档案与处理结案

> 按 CLAUDE.md 规则 31，0 字节 HTML 必须暂停并记录。
> 本档案**既是历史处理结案**（13 个空 HTML 全部落地），**也是未来遇到新空文件的工作流参考**。
> 最近更新：2026-07-24（结案 + 合并自原 `empty-page-strategy.md` / `page-audit.md`）

---

## 结案总结（2026-07-24）

- HTML 原型共 **39 个**，其中 **13 个** 为 0 字节空文件。
- **13 个空文件已全部落地 RN 实现**（`app/` 共 42 个页面文件）。
- 处理方式分两类：
  - **有真实设计源** → 按源重写（1 个：OrderDetailPage，设计源是同目录的 DeliveryTrackingPage[1/2/3]，见 ADR-0004）
  - **无设计源** → 参考同类非空页面推导（12 个，RN 文件首行均已标注 `⚠️ 无 HTML 原型，参考 [同类] 推导实现，待设计确认`）
- 无设计源的 12 个页面为视觉推导产物，**准确度待设计稿最终确认**。

---

## 13 个空 HTML 全量档案

| # | HTML 文件 | RN 实现路径 | 真实设计源 | 处理方式 | 状态 |
|---|-----------|-------------|------------|----------|------|
| 1 | OrderDetailPage | `app/order/[id].tsx` | ✅ DeliveryTrackingPage[1/2/3] | 按源重写 | ✅ 已结案（ADR-0004）|
| 2 | AfterSalesApplyPage | `app/order/after-sales-apply.tsx` | ❌ 无 | 参考 CheckoutPage 推导 | ⚠️ 待设计确认 |
| 3 | AfterSalesDetailPage | `app/order/after-sales-detail.tsx` | ❌ 无 | 参考 OrderDetailPage 推导 | ⚠️ 待设计确认 |
| 4 | OrderReviewPage | `app/order/review.tsx` | ❌ 无 | 参考 ProductDetailPage 推导 | ⚠️ 待设计确认 |
| 5 | AboutPage | `app/about.tsx` | ❌ 无 | 参考 SplashPage 推导 | ⚠️ 待设计确认 |
| 6 | OnboardingPage | `app/onboarding.tsx` | ❌ 无 | 参考 SplashPage 推导 | ⚠️ 待设计确认 |
| 7 | CouponListPage | `app/coupons.tsx` | ❌ 无 | 参考 OrderListPage 推导 | ⚠️ 待设计确认 |
| 8 | FavoriteListPage | `app/favorites.tsx` | ❌ 无 | 参考 ProductListPage 推导 | ⚠️ 待设计确认 |
| 9 | SettingsPage | `app/settings.tsx` | ❌ 无 | 参考 ProfilePage 推导 | ⚠️ 待设计确认 |
| 10 | CustomerServicePage | `app/service/index.tsx` | ❌ 无 | 参考 ProfilePage 推导 | ⚠️ 待设计确认 |
| 11 | FeedbackPage | `app/service/feedback.tsx` | ❌ 无 | 参考 CheckoutPage 推导 | ⚠️ 待设计确认 |
| 12 | HelpCenterPage | `app/service/help.tsx` | ❌ 无 | 参考 ProfilePage 推导 | ⚠️ 待设计确认 |
| 13 | NotificationListPage | `app/service/notifications.tsx` | ❌ 无 | 参考 OrderListPage 推导 | ⚠️ 待设计确认 |

> 「待设计确认」= 功能可用 + 视觉风格与同类页面一致（红色 primary header、tais-pattern、Card 阴影、图标到位），但无 HTML 源，不强求像素级相似度。

---

## 重点文件详记

### OrderDetailPage.html — 0 字节（唯一有真实设计源的空文件）

- **发现时间**：2026-06-22（用户验收 OrderDetail 时反馈「未实现原本 UI 设计」反查发现）
- **文件路径**：`/Users/linsuwei/code/Personal/html-original/pages-app/src/pages/order/OrderDetailPage.html`
- **文件大小**：0 字节（自 2026-05-31 创建起就是空文件）
- **真实设计源**：同目录下的 `DeliveryTrackingPage.html` / `DeliveryTrackingPage2.html` / `DeliveryTrackingPage3.html`
  - 3 个文件分别为 OrderDetail 的 3 个状态变体：PROCESSING / SHIPPED / DELIVERED
  - 标题都是 `<title>Order Details - Mei Mart</title>`（文件名 DeliveryTrackingPage 是误导）
- **处理方式**：按真实设计源重写 `app/order/[id].tsx`（ADR-0004）
- **代码标注**：`app/order/[id].tsx` 首行注释已说明真实设计源指向
- **相关 ADR**：[ADR-0004](./decisions/0004-order-detail-rewrite-against-real-design.md)

### AfterSalesApplyPage / AfterSalesDetailPage / OrderReviewPage — 0 字节、无设计源

这三个售后/评价页面跨目录扫描后**确认无任何设计源**，已按同类页面推导实现：

| HTML | RN 实现 | 参考来源 |
|------|---------|----------|
| AfterSalesApplyPage | `app/order/after-sales-apply.tsx` | CheckoutPage 的地址卡片 + 商品卡片样式 |
| AfterSalesDetailPage | `app/order/after-sales-detail.tsx` | OrderDetailPage 的状态色块 + 时间轴 + 价格汇总 |
| OrderReviewPage | `app/order/review.tsx` | ProductDetailPage 的商品卡片 + 星级样式 |

三个 RN 文件顶部均已标注 `⚠️ 无 HTML 原型，参考 [同类] 推导实现，待设计确认`。如后续获得设计稿需重写，建议新建 ADR-0005+ 记录。

---

## HTML 原型模块分布（合并自原 page-audit）

39 个 HTML 的模块分布与实现情况：

| 模块 | HTML 数 | 原非空 | 原空文件 | 现 RN 实现 |
|------|---------|--------|----------|-----------|
| 通用(根目录) | 4 | 2 | 2（About/Onboarding）| ✅ |
| 认证(auth) | 5 | 5 | 0 | ✅ |
| 首页(home) | 4 | 4 | 0 | ✅ |
| 商品(product) | 2 | 2 | 0 | ✅ |
| 购物车(cart) | 2 | 2 | 0 | ✅ |
| 订单(order) | 8 | 5 | 3（OrderDetail/AfterSales×2/Review，含已结案 OrderDetail）| ✅ |
| 地址(address) | 3 | 3 | 0 | ✅ |
| 用户(user) | 6 | 3 | 3（Coupon/Favorite/Settings）| ✅ |
| 服务(service) | 4 | 0 | 4（CustomerService/Feedback/Help/Notification）| ✅ |

> 注：order 模块原列「3 空」指 AfterSalesApply/AfterSalesDetail/OrderReview；OrderDetailPage 虽也是 0 字节但有 DeliveryTracking 设计源，单列。

---

## 未来遇到空 HTML 的工作流（CLAUDE.md 规则 31 要求保留）

未来若 HTML 源新增空文件，按以下流程处理：

### 判断流程

1. **先扫同目录所有非空 HTML 的 `<title>`**，找潜在设计源（如 OrderDetailPage → DeliveryTrackingPage[1/2/3]）
2. 找到设计源 → 按源重写，新建 ADR 记录
3. 找不到 → 跨目录扫（见下方方法）；仍无 → 参考同类页面推导实现，RN 文件首行标注 `⚠️ 无 HTML 原型，参考 [同类] 推导实现，待设计确认`，并在本档案补一行

### 跨目录扫描方法（已验证）

```bash
# 扫所有目录的非空 HTML，按 title 检索
cd /Users/linsuwei/code/Personal/html-original/pages-app/src/pages
for f in */*.html; do
  [ -s "$f" ] || continue
  title=$(grep -oE '<title>[^<]+</title>' "$f" | head -1)
  echo "$f — $title"
done | grep -iE "关键词"
```

### 推导实现须遵守的通用视觉规范

- 顶部用 `PrimaryHeader`（红色 tais-pattern）
- 图标用 `@expo/vector-icons` MaterialCommunityIcons / MaterialIcons
- 文化元素复用 `TaisPattern` / `TaisDivider` / `Logo`
- 卡片用 `Card` + `shadowPresets`；空状态用 `EmptyState`；错误态用 `ErrorState`
- 所有文案提取到 `locales/{zh,en,tet}.json`
