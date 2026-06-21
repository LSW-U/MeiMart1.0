# ADR-0003 — ADR-0002 复盘：视觉系统不一致，停止 Phase 3 替换

## 元信息

- **决策日期**：2026-06-22
- **状态**：✅ 已采纳
- **决策人**：Lin
- **执行人**：Claude Code
- **承接**：[ADR-0002](./0002-order-detail-refactor-upgrade-to-c.md)（不推翻，部分执行 + 部分回滚）
- **影响**：Phase 3 取消；OrderDetail 是唯一受益者

## 背景

ADR-0002 推翻 ADR-0001 时，论据是「**4-5 个 order 模块页面在重复实现类似结构**」，因此建议抽 Section 组件复用。

执行到 Phase 3 时发现：5 个目标页面虽然都在做 Items/PriceSummary/Address/Timeline 概念，但**视觉系统各自独立**，无法无视觉回归地接入新组件。

## 实际数据 — 视觉系统不一致

| 页面                                | 标题样式                      | 阴影预设                       | 商品卡形态         |
| ----------------------------------- | ----------------------------- | ------------------------------ | ------------------ |
| OrderDetail（已重构）               | `body-md`（正文）             | `shadowPresets.sm`             | 单卡片多 row       |
| OrderItemsCard 等 4 个 Section 组件 | `body-md`                     | `shadowPresets.sm`             | 单卡片多 row       |
| `tracking.tsx`                      | `body-md` + sectionDivider    | **UMA_LULIK_SHADOW**（自定义） | **每商品独立卡片** |
| `after-sales-detail.tsx`            | **`label-caps`**（小号大写）  | `shadowPresets.sm`             | 单商品             |
| `checkout.tsx`                      | **`label-caps`**              | 自定义                         | 单卡片             |
| `review.tsx`                        | 混用 `body-md` + `label-caps` | 自定义                         | 单卡片             |
| `after-sales-apply.tsx`             | **`label-caps`**              | 自定义                         | —                  |

**核心矛盾**：

- 5 个页面都在做 Items/Price/Timeline 功能（概念上复用成立）
- 但 5 个页面的标题样式 / 阴影预设 / 商品卡形态各不相同（视觉上复用不成立）

## ADR-0002 哪里错了

| ADR-0002 当初的判断                                            | 实际情况                                                                                           |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 「4-5 个页面在重复实现类似结构」                               | ✅ 功能上对，❌ 视觉上不对                                                                         |
| 触发条件「OrderDetail 基本定稿 + 后面要做售后/物流详情」已满足 | ✅ 对，但视觉系统不统一让复用反而引入回归                                                          |
| 工作量预估 3-4 小时（含其他 5 页替换）                         | 实际 Phase 1+2 约 1.5 小时，Phase 3 替换会另需 2-3 小时**改 Section 组件支持双视觉系统**，得不偿失 |

## 决策

**停止 Phase 3 替换**。OrderDetail 是唯一无风险受益者。

### 已完成的产出（保留）

- ✅ 4 个 Section 组件 + 7 个测试（Phase 1）
- ✅ OrderDetail 接入，733 → 525 行（-28%）（Phase 2）
- ✅ tsc + eslint + 全测试通过

### 取消的产出

- ❌ tracking / after-sales-detail / after-sales-apply / checkout / review 替换
- ❌ Phase 4 收缩到「OrderDetail 单页模拟器验收」

## 教训沉淀

### 教训 1：抽组件前必须先扫视觉系统一致性

抽离「可复用」组件时，**功能相似 ≠ 视觉相似**。下次抽组件前必须做：

```bash
# 扫描目标页面的视觉系统标记
grep -rE "label-caps|body-md|shadowPresets|UMA_LULIK_SHADOW" app/order/ | sort | uniq -c
```

如果有多种视觉系统并存（label-caps + body-md + 自定义阴影），**先讨论是否要先统一视觉系统**，再抽组件。

### 教训 2：ADR 触发条件要明确「视觉系统」维度

ADR-0002 列的触发条件「OrderDetail 基本定稿 + 后面要做售后/物流详情」**只考虑了功能维度**，没考虑视觉维度。

未来写 ADR 触发条件时，必须包含：

- 功能复用前提（哪些页面会用到）
- **视觉系统一致性前提**（这些页面是否用相同的标题样式/阴影/间距）
- 复用度的真实预期（无视觉变化替换 vs 接受视觉变化替换）

### 教训 3：及时停下来比硬执行更重要

Phase 3 发现差异时，按 ADR-0002「回滚预案」+ CLAUDE.md 规则 38「每个 Phase 完成后必须暂停验收」，**立即停下来让用户决策**，没有强行替换。

这是正确的做法。强行替换 = 引入 5 个页面的视觉回归，得不偿失。

### 教训 4：Phase 化执行的价值

ADR-0002 分了 4 个 Phase，每个 Phase 独立 commit。这让 Phase 3 取消时，Phase 1+2 的成果完整保留，零回滚成本。

如果当初不分 Phase，一气呵成做完 5 个页面替换才发现视觉不一致，回滚成本会指数级上升。

## 后续可选项（不在本 ADR 范围内）

如果将来确实要统一 order 模块的视觉系统，可以：

1. 先写 ADR-0004「统一 order 模块视觉系统」（标题样式 / 阴影预设 / 卡片形态）
2. 在视觉系统统一后，再回到 ADR-0002 的 Phase 3，让 5 个页面无视觉变化地接入 Section 组件

但这是**另外一项独立工作**，不在本次重构范围。

## 验收清单

- [x] 4 个 Section 组件已抽离 + 单测通过
- [x] OrderDetail 已接入（733 → 525 行）
- [x] tsc + eslint + 全测试通过
- [x] ADR-0003 已写，教训已沉淀
- [ ] 模拟器打开 OrderDetail 与重构前视觉对比（用户手动验收）
