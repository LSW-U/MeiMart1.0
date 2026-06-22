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

## 其他空 HTML（待补充）

项目共 13 个 HTML 是 0 字节（参考 v0.2 文档），需逐个排查是否：

1. 有同目录同类设计源可参考（如 OrderDetailPage 的处理方式）
2. 完全无设计源，需暂停询问用户提供

| HTML 文件                               | 状态   | 真实设计源                          | 处理方式           |
| --------------------------------------- | ------ | ----------------------------------- | ------------------ |
| `pages/order/OrderDetailPage.html`      | 0 字节 | ✅ DeliveryTrackingPage[1/2/3].html | 已重写（ADR-0004） |
| `pages/order/AfterSalesApplyPage.html`  | 0 字节 | ❓ 待查                             | 待处理             |
| `pages/order/AfterSalesDetailPage.html` | 0 字节 | ❓ 待查                             | 待处理             |
| `pages/order/OrderReviewPage.html`      | 0 字节 | ❓ 待查                             | 待处理             |
| 其他 9 个                               | 0 字节 | ❓ 待查                             | 待处理             |

未来遇到上述页面时，**先扫同目录所有非空 HTML 的 `<title>`** 找潜在设计源，再决定是否暂停询问。
