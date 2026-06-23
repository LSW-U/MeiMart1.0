# ADR-0004 — OrderDetail 推翻 ADR-0002，对齐真实 HTML 设计源重写

## 元信息

- **决策日期**：2026-06-22
- **状态**：✅ 已采纳
- **决策人**：Lin
- **执行人**：Claude Code
- **承接**：[ADR-0003](./0003-order-section-refactor-retrospective.md)
- **部分推翻**：[ADR-0002](./0002-order-detail-refactor-upgrade-to-c.md)（保留为决策演化追溯）
- **影响**：
  - 重写 `app/order/[id].tsx`（521 → 1104 行）
  - 删除 `src/components/business/order-sections/` 整个目录（4 组件 + 7 测试）
  - 抽取 `shadowPresets.umaLulik` 到 theme

## 背景

执行 ADR-0003 后的 Phase 4 用户验收阶段，用户反馈「OrderDetail 页面尚未实现原本的UI设计」。

调查根因发现：

| 文件                                                                                                             | 状态                                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pages/order/OrderDetailPage.html`（ presumed 设计源）                                                           | **0 字节**（自 5/31 创建起就是空文件）                                         |
| `app/order/[id].tsx` 首行注释                                                                                    | 已标注「⚠️ 无 HTML 原型，参考 OrderListPage + OrderCard 推导实现，待设计确认」 |
| 真实设计源 `pages/order/DeliveryTrackingPage.html` / `DeliveryTrackingPage2.html` / `DeliveryTrackingPage3.html` | 共 933 行（328 + 320 + 285），覆盖 PROCESSING / SHIPPED / DELIVERED 三个状态   |

**核心错误**：ADR-0001/0002/0003 都是在「OrderDetailPage.html 是空文件、无设计源」的错误前提下做的决策。文件名 `DeliveryTrackingPage` 误导，实际内容是 OrderDetail 的 3 个状态变体（标题都是 "Order Details - Mei Mart"）。

## ADR-0002 哪里错了

| ADR-0002 当初的决策                                 | 实际情况                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 抽 4 个 Section 组件复用                            | ❌ 视觉系统与新设计不匹配（single-card items / body-md 标题 / shadowPresets.sm 全错） |
| 复用范围包括 OrderDetail                            | ❌ OrderDetail 必须重写对齐 HTML，无法复用                                            |
| ADR-0003 已判定 5 个其他 order 页面视觉不一致不复用 | ✅ 这个判断正确，但更进一步：连 OrderDetail 自己都用不上                              |

**结论**：4 个 Section 组件从投入到本次重写前，零实际使用案例。属于「过度设计 + 错前提双重失败」。

## 决策

### 推翻内容

- ❌ **推翻**：ADR-0002 的「抽 4 个 Section 组件复用」方案
- ❌ **删除**：`src/components/business/order-sections/` 整个目录（4 组件 + 7 测试 + index）

### 保留并新增

- ✅ **保留**：ADR-0001/0002/0003 作为决策演化追溯（不删除历史 ADR）
- ✅ **新增**：抽取 `shadowPresets.umaLulik` 到 `src/theme/shadowPresets.ts`（Phase A 已完成，独立价值）
- ✅ **新增**：`app/order/[id].tsx` 完全重写为单文件，参照 `app/order/tracking.tsx` 已正确实现的设计模式

### 重写核心结构（对齐 `DeliveryTrackingPage[1/2/3].html`）

| HTML 模块                       | 实现方式                                                                                                             |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Order Header Card               | ORDER NUMBER label-caps + price-display 订单号 + Placed date + SVG 平行四边形 StatusBadge + 状态色边 delivery banner |
| Delivery Address Card           | location_on icon + 标题 + EDIT link + 姓名/电话/地址                                                                 |
| Order Items Section             | 渐变 divider 标题 + 每商品独立卡片（80×80 图 + 标题 + Qty + price-display 价格）                                     |
| Order Summary Card              | label-caps "ORDER SUMMARY" + Subtotal/Shipping/Discount(emerald) + 虚线分隔 + 24px price-display Total               |
| Payment & Timeline Card（合并） | 上：LaisPay 徽章 + "LaisPay Wallet"；下：custom timeline with absolute-positioned line + ring-4 active dot           |
| Sticky Action Buttons           | 2 列 grid，状态切换：Track/Repeat + Contact/Review（HTML）+ Cancel/Pay/Refund（业务保留）                            |

### 状态映射（HTML 3 状态 → 业务 6 状态）

| 业务状态    | HTML 来源                         | 视觉处理                                               |
| ----------- | --------------------------------- | ------------------------------------------------------ |
| `pending`   | （HTML 未画）→ 借 PROCESSING 配色 | 橙色 TO PAY badge + 蓝边 PAYMENT DEADLINE banner       |
| `paid`      | PROCESSING                        | 橙色 PROCESSING badge + 蓝边 ESTIMATED DELIVERY banner |
| `shipped`   | SHIPPED                           | 橙色 SHIPPED badge + 蓝边 ESTIMATED DELIVERY banner    |
| `delivered` | DELIVERED                         | emerald DELIVERED badge + 翠边 DELIVERY STATUS banner  |
| `cancelled` | （HTML 未画）                     | 红色 CANCELLED badge + 红边 ORDER CANCELLED banner     |
| `refunding` | （HTML 未画）                     | 橙色 REFUNDING badge + 黄边 REFUND STATUS banner       |

## 教训沉淀

### 教训 1：HTML 文件命名不能轻信

`DeliveryTrackingPage.html` 实际是 OrderDetail 的 3 个状态变体，标题写的是 "Order Details - Mei Mart"。下次发现空 HTML 时，**必须扫同目录下文件名相近、标题相近的所有 HTML**，不能因为文件名匹配不上就放弃。

```bash
# 扫同目录所有 HTML 的 title，找潜在设计源
for f in pages/order/*.html; do
  [ -s "$f" ] || continue
  title=$(grep -oE '<title>[^<]+</title>' "$f" | head -1)
  echo "$f — $title"
done
```

### 教训 2：空 HTML 必须立即记入 docs/empty-html-files.md

按 CLAUDE.md 规则 31，0 字节 HTML 必须暂停并记录。**这次没做对** — `OrderDetailPage.html` 0 字节的状态从 5/31 项目初始化时就被注意到（`[id].tsx` 首行注释），但当时没建 `docs/empty-html-files.md`，导致整个 ADR-0001/0002/0003 都在错误前提下推导。

未来遇到空 HTML 必须立即建档案，不能依赖代码注释。

### 教训 3：组件抽象前必须先确认设计源

ADR-0002 抽 4 个 Section 组件时，**默认了 OrderDetail 已有 HTML 设计源**（实际上没有），所以「按现有 OrderDetail 形态抽象组件」其实是「按错误实现抽象组件」。

下次抽组件前必须做：

1. 确认设计源（HTML / Figma / 设计师口述）
2. 验证现有实现对设计源的还原度（CLAUDE.md 规则 27 + 28）
3. 如果现有实现已经偏离设计，先还原设计，再考虑抽象

### 教训 4：发现错误前提时立即重写，不要硬撑

ADR-0003 时已经发现「5 个目标页面视觉系统不一致」让 Phase 3 无法执行，但当时没追问「为什么 OrderDetail 的实现是凭空推导的」。如果当时往深查一步，能更早发现 OrderDetailPage.html 是空文件。

未来遇到「执行不下去」时，多问一个 why — 可能不是「执行问题」而是「前提错误」。

## 后续可选项（不在本 ADR 范围内）

1. **同步升级 `tracking.tsx` 的 StatusBadge**：tracking.tsx 当前用矩形 badge，本次 OrderDetail 用了 SVG 平行四边形。两者应保持一致。建议未来抽 `<StatusBadge>` 共享组件。
2. **`DeliveryTrackingPage.html` 重命名为 `OrderDetailPage.html`**：文件名应反映内容。但这是 HTML 源仓库的事，不在本仓库范围。
3. **补 `OrderDetailPage.html` 的镜像设计源**：可在 `docs/design-sources/` 留一份说明，指明 OrderDetail 的真实设计源在 DeliveryTrackingPage[1/2/3].html。

## 验收清单

- [x] `src/theme/shadowPresets.ts` 新增 `umaLulik` 预设（Phase A，commit `a13f8d0`）
- [x] `tracking.tsx` 和 `product/list.tsx` 替换本地常量为 theme 引用（Phase A）
- [x] `app/order/[id].tsx` 完全重写对齐 HTML（Phase B，commit `0385d23`）
- [x] `src/components/business/order-sections/` 删除（Phase C）
- [x] tsc + eslint + 全测试通过（Phase A/B/C 都验证过）
- [x] ADR-0004 已写，教训已沉淀
- [ ] docs/empty-html-files.md 已建档案
- [ ] 模拟器逐状态视觉验收（用户手动）
