# 空 HTML 文件档案

按 CLAUDE.md 规则 31，0 字节 HTML 必须暂停并记录。本档案维护空 HTML 列表 + 真实设计源指向。

## OrderDetailPage.html — 0 字节

- **发现时间**：2026-06-22（用户验收 OrderDetail 时反馈「未实现原本 UI 设计」反查发现）
- **文件路径**：`/Users/linsuwei/code/Personal/html-original/pages-app/src/pages/order/OrderDetailPage.html`
- **文件大小**：0 字节（自 2026-05-31 创建起就是空文件）
- **真实设计源**：同目录下的 `DeliveryTrackingPage.html` / `DeliveryTrackingPage2.html` / `DeliveryTrackingPage3.html`
  - 3 个文件分别为 OrderDetail 的 3 个状态变体：PROCESSING / SHIPPED / DELIVERED
  - 标题都是 `<title>Order Details - Mei Mart</title>`（文件名 DeliveryTrackingPage 是误导）
- **处理方式**：按真实设计源重写 `app/order/[id].tsx`（ADR-0004）
- **代码标注**：`app/order/[id].tsx` 首行注释已说明真实设计源指向
- **相关 ADR**：[ADR-0004](./decisions/0004-order-detail-rewrite-against-real-design.md)

## AfterSalesApplyPage.html — 0 字节

- **发现时间**：2026-06-23（批量排查 order 模块空 HTML 时发现）
- **文件路径**：`/Users/linsuwei/code/Personal/html-original/pages-app/src/pages/order/AfterSalesApplyPage.html`
- **文件大小**：0 字节（自 2026-05-31 创建起就是空文件）
- **真实设计源**：❌ **无**（跨目录扫 26 个非空 HTML，无任何售后/退款相关页面）
- **当前 RN 实现**：`app/order/after-sales-apply.tsx`（490 行）
  - 顶部已标注「⚠️ 无 HTML 原型，参考 CheckoutPage 推导实现，待设计确认」
  - 参考来源：CheckoutPage 的地址卡片 + 商品卡片样式
- **处理方式**：等待用户提供设计稿；当前实现为视觉推导，准确度无法验证
- **相关 ADR**：暂无（如重写需新建 ADR-0005）

## AfterSalesDetailPage.html — 0 字节

- **发现时间**：2026-06-23
- **文件路径**：`/Users/linsuwei/code/Personal/html-original/pages-app/src/pages/order/AfterSalesDetailPage.html`
- **文件大小**：0 字节
- **真实设计源**：❌ **无**
- **当前 RN 实现**：`app/order/after-sales-detail.tsx`（460 行）
  - 顶部已标注「⚠️ 无 HTML 原型，参考 OrderDetailPage 推导实现，待设计确认」
  - 参考来源：OrderDetailPage 的状态色块 + 时间轴 + 价格汇总
- **处理方式**：等待用户提供设计稿
- **相关 ADR**：暂无

## OrderReviewPage.html — 0 字节

- **发现时间**：2026-06-23
- **文件路径**：`/Users/linsuwei/code/Personal/html-original/pages-app/src/pages/order/OrderReviewPage.html`
- **文件大小**：0 字节
- **真实设计源**：❌ **无**
- **当前 RN 实现**：`app/order/review.tsx`（468 行）
  - 顶部已标注「⚠️ 无 HTML 原型，参考 ProductDetailPage 推导实现，待设计确认」
  - 参考来源：ProductDetailPage 的商品卡片 + 星级样式
- **处理方式**：等待用户提供设计稿
- **相关 ADR**：暂无

## 其他空 HTML（待补充）

项目共 13 个 HTML 是 0 字节（参考 v0.2 文档），需逐个排查是否：

1. 有同目录同类设计源可参考（如 OrderDetailPage 的处理方式）
2. 完全无设计源，需暂停询问用户提供

| HTML 文件                               | 状态   | 真实设计源                          | 处理方式           |
| --------------------------------------- | ------ | ----------------------------------- | ------------------ |
| `pages/order/OrderDetailPage.html`      | 0 字节 | ✅ DeliveryTrackingPage[1/2/3].html | 已重写（ADR-0004） |
| `pages/order/AfterSalesApplyPage.html`  | 0 字节 | ❌ 无（跨目录扫无）                 | 待用户提供设计稿   |
| `pages/order/AfterSalesDetailPage.html` | 0 字节 | ❌ 无（跨目录扫无）                 | 待用户提供设计稿   |
| `pages/order/OrderReviewPage.html`      | 0 字节 | ❌ 无（跨目录扫无）                 | 待用户提供设计稿   |
| 其他 9 个                               | 0 字节 | ❓ 待查                             | 待处理             |

未来遇到上述页面时，**先扫同目录所有非空 HTML 的 `<title>`** 找潜在设计源，再决定是否暂停询问。

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
