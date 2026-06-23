# 设计 Token 提取

> 提取日期：2026-06-13
> 源目录：`/Users/linsuwei/code/Personal/html-original/pages-app/src/pages`

## 1. Tailwind 原始配置（所有 HTML 文件一致）

```javascript
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-secondary-fixed-variant": "#454747",
        outline: "#8d706c",
        "surface-container": "#ffe9e6",
        "on-error-container": "#93000a",
        background: "#fff8f7",
        "inverse-surface": "#3c2d2b",
        "on-primary-fixed": "#410001",
        "surface-bright": "#fff8f7",
        "on-secondary-container": "#616363",
        "on-surface-variant": "#59413d",
        "tertiary-container": "#825d00",
        "primary-container": "#b83228",
        "on-tertiary-container": "#ffdc9f",
        "outline-variant": "#e1bfba",
        "on-secondary-fixed": "#1a1c1c",
        "error-container": "#ffdad6",
        secondary: "#5d5f5f",
        "on-background": "#261816",
        "on-tertiary": "#ffffff",
        surface: "#fff8f7",
        "on-primary": "#ffffff",
        "inverse-primary": "#ffb4aa",
        "inverse-on-surface": "#ffedea",
        "tertiary-fixed": "#ffdea5",
        "surface-container-lowest": "#ffffff",
        "secondary-container": "#dfe0e0",
        primary: "#961813",
        "surface-tint": "#b02d23",
        error: "#ba1a1a",
        "secondary-fixed": "#e2e2e2",
        "tertiary-fixed-dim": "#f5be4c",
        "on-tertiary-fixed-variant": "#5d4200",
        "surface-container-highest": "#f7ddd9",
        "on-surface": "#261816",
        "primary-fixed": "#ffdad5",
        "surface-dim": "#eed4d1",
        "surface-container-low": "#fff0ee",
        "on-primary-fixed-variant": "#8e120e",
        "secondary-fixed-dim": "#c6c6c7",
        "on-primary-container": "#ffd8d3",
        "on-secondary": "#ffffff",
        tertiary: "#634700",
        "on-tertiary-fixed": "#271900",
        "surface-variant": "#f7ddd9",
        "on-error": "#ffffff",
        "primary-fixed-dim": "#ffb4aa",
        "surface-container-high": "#fce2df"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px"
      },
      spacing: {
        unit: "4px",
        gutter: "12px",
        xs: "4px",
        sm: "8px",
        "container-margin": "20px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px"
      },
      fontFamily: {
        h1: ["Noto Serif"],
        h2: ["Noto Serif"],
        h3: ["Noto Serif"],
        "body-sm": ["Plus Jakarta Sans"],
        "body-lg": ["Plus Jakarta Sans"],
        "body-md": ["Plus Jakarta Sans"],
        "label-caps": ["Plus Jakarta Sans"],
        "price-display": ["Plus Jakarta Sans"]
      },
      fontSize: {
        h1: ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["24px", { lineHeight: "1.3", fontWeight: "700" }],
        h3: ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "1.2", letterSpacing: "0.05em", fontWeight: "700" }],
        "price-display": ["20px", { lineHeight: "1.0", fontWeight: "700" }]
      }
    }
  }
};
```

## 2. 颜色 Token 详表

### Primary Palette（品牌红/东帝汶文化红）

| Token | Hex | 用途 |
|-------|-----|------|
| primary | #961813 | 主品牌色，CTA 按钮，激活态 |
| primary-container | #b83228 | 头部背景，强调容器 |
| on-primary | #ffffff | 主色上的文字 |
| on-primary-container | #ffd8d3 | primary-container 上的文字 |
| on-primary-fixed | #410001 | 主色固定深色文字 |
| on-primary-fixed-variant | #8e120e | 主色固定变体文字 |
| primary-fixed | #ffdad5 | 固定浅主色 |
| primary-fixed-dim | #ffb4aa | 调光固定主色 |
| inverse-primary | #ffb4aa | 反色面上的主色 |
| surface-tint | #b02d23 | 表面着色 |

### Secondary Palette（中性灰）

| Token | Hex | 用途 |
|-------|-----|------|
| secondary | #5d5f5f | 次要文字，非激活图标 |
| secondary-container | #dfe0e0 | 次要容器 |
| on-secondary | #ffffff | secondary 上的文字 |
| on-secondary-container | #616363 | secondary-container 上的文字 |
| on-secondary-fixed | #1a1c1c | 固定深色文字 |
| on-secondary-fixed-variant | #454747 | 固定变体文字 |
| secondary-fixed | #e2e2e2 | 固定浅色 |
| secondary-fixed-dim | #c6c6c7 | 调光固定色 |

### Tertiary Palette（金色/琥珀色 — 文化强调色）

| Token | Hex | 用途 |
|-------|-----|------|
| tertiary | #634700 | 强调色，优惠券，星级 |
| tertiary-container | #825d00 | 金色强调容器 |
| on-tertiary | #ffffff | tertiary 上的文字 |
| on-tertiary-container | #ffdc9f | tertiary-container 上的文字 |
| on-tertiary-fixed | #271900 | 固定深色文字 |
| on-tertiary-fixed-variant | #5d4200 | 固定变体文字 |
| tertiary-fixed | #ffdea5 | 固定浅金色 |
| tertiary-fixed-dim | #f5be4c | 调光固定金色 |

### Error Palette

| Token | Hex | 用途 |
|-------|-----|------|
| error | #ba1a1a | 错误状态 |
| error-container | #ffdad6 | 错误背景 |
| on-error | #ffffff | error 上的文字 |
| on-error-container | #93000a | error-container 上的文字 |

### Surface Palette（暖粉白色）

| Token | Hex | 用途 |
|-------|-----|------|
| background | #fff8f7 | 应用背景 |
| surface | #fff8f7 | 卡片/区块背景 |
| surface-bright | #fff8f7 | 明亮面 |
| surface-dim | #eed4d1 | 暗淡面 |
| surface-variant | #f7ddd9 | 变体面，输入框背景 |
| surface-container | #ffe9e6 | 容器背景 |
| surface-container-low | #fff0ee | 低强调容器 |
| surface-container-lowest | #ffffff | 最低强调容器（白） |
| surface-container-high | #fce2df | 高强调容器 |
| surface-container-highest | #f7ddd9 | 最高强调容器 |
| on-background | #261816 | 背景上的文字 |
| on-surface | #261816 | 面上的主文字 |
| on-surface-variant | #59413d | 面上的次要文字 |
| inverse-surface | #3c2d2b | 深色面 |
| inverse-on-surface | #ffedea | 反色面上的文字 |

### Outline Palette

| Token | Hex | 用途 |
|-------|-----|------|
| outline | #8d706c | 边框，分隔线 |
| outline-variant | #e1bfba | 细微边框，分隔线 |

### 非配置色值（HTML 内联/SVG/CSS 硬编码）

| 色值 | 来源 | 角色 |
|------|------|------|
| #D4A030 | HomePage, OrderListPage SVG | 文化金色装饰点 |
| #FAF7F2 | HomePage Uma Lulik SVG | 暖白过渡色 |
| #F97316 | DeliveryTrackingPage | Processing 状态徽章 |
| #F5BE4C | HomePage, OrderListPage | 配送提示栏背景 |
| #FFF8F1 | SplashPage | 启动屏背景 |
| #a20513 | SplashPage diamond-pattern | 菱形装饰色 |

## 3. 字体 Token

### 字体家族

| Token | 字体 | 用途 |
|-------|------|------|
| h1 | Noto Serif | 一级标题 |
| h2 | Noto Serif | 二级标题 |
| h3 | Noto Serif | 三级标题 |
| body-sm | Plus Jakarta Sans | 小号正文 |
| body-md | Plus Jakarta Sans | 默认正文 |
| body-lg | Plus Jakarta Sans | 大号正文 |
| label-caps | Plus Jakarta Sans | 大写标签 |
| price-display | Plus Jakarta Sans | 价格数字 |

### 字号详情

| Token | Size | Line Height | Weight | Letter Spacing |
|-------|------|-------------|--------|----------------|
| h1 | 32px | 1.2 | 700 | — |
| h2 | 24px | 1.3 | 700 | — |
| h3 | 20px | 1.4 | 600 | — |
| body-lg | 18px | 1.6 | 400 | — |
| body-md | 16px | 1.5 | 400 | — |
| body-sm | 14px | 1.5 | 400 | — |
| label-caps | 12px | 1.2 | 700 | 0.05em |
| price-display | 20px | 1.0 | 700 | — |

## 4. 间距 Token

| Token | 值 | 说明 |
|-------|-----|------|
| unit | 4px | 基础单位 |
| xs | 4px | 极小 |
| sm | 8px | 小 |
| gutter | 12px | 网格/项目间距 |
| container-margin | 20px | 水平页面边距 |
| md | 16px | 中 |
| lg | 24px | 大 |
| xl | 32px | 极大 |
| xxl | 48px | 超大 |

## 5. 圆角 Token

| Token | 值 | 等效 px |
|-------|-----|---------|
| DEFAULT | 0.25rem | 4px |
| lg | 0.5rem | 8px |
| xl | 0.75rem | 12px |
| full | 9999px | 药丸/圆形 |

## 6. 阴影值（HTML 内联，非配置 Token）

| 值 | 用途 |
|----|------|
| shadow-[0_4px_6px_rgba(150,24,19,0.2)] | 浮动购物车按钮 |
| shadow-[0_-4px_6px_-1px_rgba(38,24,22,0.1)] | 底部导航栏 |
| shadow-[0_-4px_20px_rgba(0,0,0,0.05)] | 商品详情粘性底栏 |
| shadow-[0_-10px_20px_rgba(0,0,0,0.02)] | 结算栏 |
| shadow-[0_-4px_12px_0_rgba(93,66,0,0.05)] | 配送追踪 |
| shadow-[4px_4px_0px_0px_rgba(141,112,108,0.2)] | 印章效果按钮 |

## 7. 动画（HTML `<style>` 定义，非配置 Token）

| 名称 | 时长 | 缓动 | 定义 |
|------|------|------|------|
| pulse-dots | 1.4s | ease-in-out infinite | 0%/80%/100%: opacity 0.3, scale(0.8); 40%: opacity 1, scale(1) |
| shimmer | 1.5s | linear infinite | 0%: background-position -200%; 100%: background-position 200% |
| fadeIn | 0.4s | ease-out forwards | from: opacity 0, translateY(10px); to: opacity 1, translateY(0) |
| ripple-fade | — | default | to: scale(4), opacity 0 |

## 8. 文化装饰 CSS 模式

| 模式名 | 定义 | 使用页面 |
|--------|------|---------|
| tais-pattern (variant 1) | repeating-linear-gradient + radial dots rgba(255,218,213,0.15) | ProfilePage, ProfileEmptyPage |
| tais-pattern (variant 2) | linear-gradient 45deg with #8d706c at 10px intervals | ProductDetailPage |
| tais-pattern (variant 3) | 6-layer linear-gradient with #b02d23 at 40px/70px | AddressEditPage |
| diamond-pattern | 4-layer linear-gradient 45deg/-45deg with #a20513, opacity 0.03 | SplashPage |
| header-pattern | repeating-linear-gradient + inline SVG diamonds | HomePage |
| uma-lulik-cut | clip-path: polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%) | LoginPage |
| uma-lulik-silhouette | clip-path: polygon(50% 0%, 100% 80%, 85% 80%, 85% 100%, 15% 100%, 15% 80%, 0% 80%) | ProfilePage, ProfileEmptyPage |
| logo-badge | clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%) (菱形) | SplashPage |
| scalloped-border | clip-path: polygon(...) 扇贝边 | CartPage, PaymentPage |

## 9. Token 统计

| 类别 | 数量 |
|------|------|
| 颜色 Token（配置内） | 40 |
| 颜色 Token（内联/非配置） | 6 |
| 字体家族 | 2 |
| 字号定义 | 8 |
| 间距 Token | 9 |
| 圆角 Token | 4 |
| 阴影值 | 6 |
| 动画 | 4 |
| 文化装饰模式 | 9 |
| **色板 Token 总计** | **46** |
