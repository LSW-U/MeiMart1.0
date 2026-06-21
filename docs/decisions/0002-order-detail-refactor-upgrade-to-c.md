# ADR-0002 — OrderDetail 升级到方案 C（Section 拆分）

## 元信息

- **决策日期**：2026-06-21
- **状态**：✅ 已采纳，执行中
- **决策人**：Lin
- **执行人**：Claude Code
- **推翻**：ADR-0001（保持原文件不动，作为决策演化追溯）
- **相关 ADR**：[ADR-0001](./0001-order-detail-refactor-choose-a-not-c.md)

## 背景

ADR-0001 时选方案 A，理由是「OrderDetail 短期内不做相关页」+「YAGNI」。复盘发现：

- order 模块已有 4-5 个页面在重复实现类似结构
- `tracking.tsx` 921 行、`after-sales-apply.tsx` 490 行、`after-sales-detail.tsx` 460 行、`checkout.tsx` 462 行、`review.tsx` 468 行
- 共性结构：商品列表 / 金额汇总 / 地址卡片 / 时间线

ADR-0001 自己列的触发条件「OrderDetail 基本定稿 + 后面要做售后/物流详情」**已满足**。

## 决策

**升级到方案 C**：抽离 4 个 Section 子组件到 `src/components/business/order-sections/`：

| 组件                    | 职责                                 | 复用页面                                                                            |
| ----------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| `OrderItemsCard`        | 商品列表（图片/名称/规格/数量/单价） | OrderDetail / tracking / after-sales-detail / after-sales-apply / checkout / review |
| `OrderPriceSummaryCard` | 金额汇总（商品总额/运费/优惠/实付）  | OrderDetail / after-sales-detail / after-sales-apply / checkout                     |
| `OrderAddressCard`      | 收货地址                             | OrderDetail / tracking / checkout                                                   |
| `OrderTimelineCard`     | 时间线聚合（基于 TimelineStep）      | OrderDetail / tracking / after-sales-detail                                         |

## 执行步骤

1. **Phase 1**：抽离 4 个 Section 组件 + 单测（独立 commit）
2. **Phase 2**：`OrderDetail` 替换为复用（独立 commit，733 → ~250 行）
3. **Phase 3**：`tracking.tsx` / `after-sales-detail.tsx` / `after-sales-apply.tsx` / `checkout.tsx` / `review.tsx` 逐个替换（每页独立 commit）
4. **Phase 4**：CP 验收（tsc + eslint + 测试 + 模拟器逐页截图对比）

## 回滚预案

如果某页面替换后出现回归：

- 立即 `git revert` 该 commit
- 在 ADR-0002 末尾追加「部分回滚」记录，说明哪些页面继续用 Section，哪些保留原实现

## 验收标准

- `npx tsc --noEmit` 0 错误
- `npx eslint . --max-warnings 0` 0 警告
- 4 个 Section 组件各有 1 个渲染测试
- OrderDetail 行数从 733 → 300 以内
- 模拟器逐页对比：与替换前视觉一致（用户验收）

## 工作量预估

- Phase 1（抽组件 + 测试）：60-90 分钟
- Phase 2（OrderDetail 替换）：30 分钟
- Phase 3（其他 5 页替换）：60-90 分钟
- Phase 4（验收）：30 分钟
- **合计**：3-4 小时
