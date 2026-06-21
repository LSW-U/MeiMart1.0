# ADR-0001 — OrderDetail 重构选方案 A（单文件）而非方案 C（Section 拆分）

## 元信息

- **决策日期**：2026-06-21（基于 commit `c467b80` 反向推断）
- **状态**：✅ 已采纳方案 A，已实施；待复盘是否升级到方案 C
- **决策人**：Lin
- **执行人**：Claude Code
- **相关 commit**：
  - `03d9553 fix: OrderDetail 页 UI 优化 — 时间格式化 + 卡片一致性 + 按钮宽度分层`
  - `c467b80 fix: OrderDetail UI 复原 — 4 处局部打磨（不动共享组件）`

## 背景

`app/order/[id].tsx`（OrderDetail 页）在批次 D 推导后行数达到 **733 行**。原因：

- `OrderDetailPage.html` 是 0 字节空文件，无 HTML 原型
- 全部逻辑靠推导，揉在一个文件里

2026-06-21 在 iOS 模拟器上对 OrderDetail 做 UI 验收时，Lin 与 Claude Code 讨论了三个重构方案：

| 方案               | 文件结构                         | 单文件行数           | 复用性                  |
| ------------------ | -------------------------------- | -------------------- | ----------------------- |
| **A** 单文件       | `[id].tsx` 一个文件              | 700+                 | 仅本页用                |
| **B** 内部分块     | `[id].tsx` 一个文件，函数分块    | 700+                 | 仅本页用                |
| **C** Section 拆分 | `[id].tsx` + 8 个 Section 子组件 | 主 200 + 每子 50-100 | 售后详情/物流详情可复用 |

## 对比维度（决策时讨论的）

| 维度           | 方案 A（单文件） | 方案 C（拆 Section）             |
| -------------- | ---------------- | -------------------------------- |
| 文件数         | 1 个 700+ 行     | 1 + 8 个，每个 50-100 行         |
| 单文件可读性   | 滚动找 section   | 直接打开目标文件                 |
| 复用性         | 仅本页用         | 同结构可用在售后详情等页         |
| 测试           | 整页 snapshot    | 每 section 单测，更细            |
| 改一个 section | grep 找位置      | 直接定位                         |
| 回归风险       | 0                | 中（refactor 本身就有 bug 风险） |
| 工作量         | 0                | 1-2 小时纯搬运 + 测试            |

## 决策

**当时**：选方案 A。

理由（按 Lin 图片里的决策表推断）：

- OrderDetail 当时被认为基本定稿，**短期内不会做相关页**
- YAGNI 原则——避免 premature abstraction
- 回归风险为零，对生产中页面最安全

commit `c467b80` 标题里写明：「**按方案 A** 在 `[id].tsx` 局部范围继续打磨」——是采纳 A 的直接证据。

## 现状复盘（2026-06-21 当天）

**方案 C 的「未来复用前提」现在已成立**。order 模块实际行数：

| 文件                     | 行数 | 复用场景                                    |
| ------------------------ | ---- | ------------------------------------------- |
| `[id].tsx` OrderDetail   | 733  | —                                           |
| `tracking.tsx` 物流详情  | 921  | TimelineCard + ItemsCard                    |
| `after-sales-apply.tsx`  | 490  | ItemsCard + PriceSummaryCard                |
| `after-sales-detail.tsx` | 460  | ItemsCard + PriceSummaryCard + TimelineCard |
| `checkout.tsx`           | 462  | ItemsCard + AddressCard + PriceSummaryCard  |
| `review.tsx`             | 468  | ItemsCard + 评价卡片                        |

**4-5 个页面在重复实现类似结构**——方案 C 当初的预测成立。

## 待决策：是否升级到方案 C

按 Lin 原决策表的对应情况：

> 「OrderDetail 基本定稿，后面要做售后/物流详情 → 推荐 C，提前抽可复用部分」

**触发条件已满足**，建议升级。具体步骤：

1. 抽离 4 个 Section 子组件到 `src/components/business/order-sections/`：
   - `OrderItemsCard.tsx` — 商品列表（含图片、名称、规格、数量、单价）
   - `OrderPriceSummaryCard.tsx` — 金额汇总（商品总额/运费/优惠/实付）
   - `OrderAddressCard.tsx` — 收货地址
   - `OrderTimelineCard.tsx` — 时间线（聚合 TimelineStep）
2. `OrderDetail` 从 733 行 → 约 200-300 行（编排为主）
3. `tracking.tsx` / `after-sales-detail.tsx` / `checkout.tsx` 替换为复用
4. 每个 Section 写独立单测
5. 模拟器逐页截图对比，确保零回归

**预估工作量**：3-4 小时（含测试 + 截图验证）。
**回归风险**：中。必须有逐页截图 + section 单测兜底。

## 决策记录人备注

> 此 ADR 是 **事后补记**——决策时只存在对话上下文中，没有同步落到文件。
> 2026-06-21 Lin 用 `/resume` 想恢复对话时，发现 `/resume` 列表里没有这个对话，
> Claude Code 也无法找到方案 C 的具体讨论。事后从 commit message 反向推断决策，
> 但完整的 A/B/C 对比内容只能靠 Lin 截屏重述。
>
> 教训：**重要决策必须当场写 ADR，不要依赖 /resume 或对话上下文**。
> 见 `docs/decisions/RECOVERY-WORKFLOW.md` 的工作流约定。
