# 样式策略决策（v1.0）

**决策日期**：2026-06-15
**决策者**：用户

## 结论

**MeiMart 客户端采用 StyleSheet 精细翻译路线，NativeWind 不激活。**

## 决策依据

### 现状诊断

- `babel.config.js` 无 `nativewind/babel` 插件 → NativeWind 实际未激活
- `metro.config.js` 无 `withNativeWind` wrapper → 同上
- 77 个组件 / 页面文件全部使用 StyleSheet，0 个使用 className
- `tailwind.config.js` 已配置完整色板和间距 Token

### 选择 StyleSheet 的理由

1. **零运行时开销**：StyleSheet 在原生层编译，性能优于 NativeWind 的运行时 className 解析
2. **类型安全**：直接使用 `colors.xxx` `spacing.xxx` 有 TS 提示，避免 className 拼写错误
3. **可控性**：复杂样式（阴影/渐变/动画）通过对象组合更清晰
4. **团队熟悉度**：RN 生态原生写法，新成员上手成本低
5. **依赖最小化**：避免引入 nativewind/babel 后带来的构建复杂度

### 保留 tailwind.config.js 的理由

作为**设计 Token 字典**：所有颜色、间距、字体、阴影的命名都源于 Tailwind config，开发者翻译 HTML 的 Tailwind class 时可以直接查阅此文件，避免色值/间距偏差。

## 不要做的事

- ❌ 不要修改 `babel.config.js` 添加 `nativewind/babel`
- ❌ 不要修改 `metro.config.js` 添加 `withNativeWind`
- ❌ 不要从组件中改 StyleSheet → className
- ❌ 不要卸载 `nativewind` 依赖（避免引发其他依赖问题，已悬挂状态可接受）

## 配套资产

- `tailwind.config.js` — 设计 Token 字典
- `docs/tailwind-to-rn-mapping.md` — Tailwind class → RN StyleSheet 翻译参考表
- `src/theme/` — colors / typography / spacing / gradients

## HTML 原型内联阴影值（存档）

RN 无法直接消费 CSS `box-shadow` 字符串，因此这些源自 HTML 原型的内联 shadow 值不进入 `src/theme/`，仅在此存档。RN 侧的阴影统一走 `src/theme/shadowPresets.ts`（iOS `shadow*` + Android `elevation`）。下方为各业务元素在 HTML 原型中的原始取值，翻译对应页面时可查阅：

| 元素 | HTML 原型 shadow |
| --- | --- |
| floating-cart | `0px 4px 6px rgba(150,24,19,0.2)` |
| bottom-nav | `0px -4px 6px -1px rgba(38,24,22,0.1)` |
| sticky-footer | `0px -4px 20px rgba(0,0,0,0.05)` |
| checkout-bar | `0px -10px 20px rgba(0,0,0,0.02)` |
| delivery-tracking | `0px -4px 12px 0px rgba(93,66,0,0.05)` |
| stamp-button | `4px 4px 0px 0px rgba(141,112,108,0.2)` |
