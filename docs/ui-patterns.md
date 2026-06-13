# UI 模式识别

> 识别日期：2026-06-13
> 源目录：`/Users/linsuwei/code/Personal/html-original/pages-app/src/pages`

## 模式总览

共识别出 17 种 UI 模式（含文化元素子模式 11 种）。

## 模式清单

### 1. 底部导航栏 (Bottom Navigation)

5 Tab 固定底部导航：Home / Categories / Cart / Orders / Account。激活 Tab 有填充图标 + `text-primary` + 顶部指示条。Cart Tab 带数量徽章。`h-[64px] bg-white border-t border-outline-variant shadow-lg`。

**使用页面**：HomePage, CategoryPage, SearchResultPage, CartPage, CartPageEmpty, OrderListPage, PaymentResultPage, ProfilePage, ProfileEditPage, ProfileEmptyPage, CheckoutPage, DeliveryTrackingPage

---

### 2. 搜索栏 (Search Bar)

圆角输入框 + search 图标 + 可选 mic/close 按钮。两种变体：嵌入头部（`bg-surface-container-lowest`）和独立区块（`bg-white shadow-sm`）。

**使用页面**：HomePage, SearchPage, SearchResultPage

---

### 3. 商品卡片 (Product Card)

三种变体：

- **竖版**：`aspect-[4/5]` 图片 + 标签 + 加购按钮 + 收藏按钮 + 类目/名称/价格。用于 2 列网格。
- **横版**：排名数字 + 缩略图 + 内容区。前 3 名用 `uma-lulik-shadow` 强调。
- **小横版**：紧凑推荐卡（Buy Again / People Also Bought），`min-w-[140px]`。

**使用页面**：HomePage, SearchPage, SearchResultPage, CategoryPage, ProductListPage, CartPage, CheckoutPage

---

### 4. 订单卡片 (Order Card)

订单号 + 日期 + 状态徽章 + 商品缩略图行 + 总价 + 操作按钮（DETAILS / TRACK / BUY AGAIN）。`bg-white rounded-2xl border border-outline-variant shadow-sm`。

**使用页面**：OrderListPage

---

### 5. 地址卡片 (Address Card)

可选中的地址卡片，含 radio 选择态。收件人 + 默认标签 + 电话 + 地址 + 编辑/删除按钮。选中态 `border-primary bg-surface-container-low`。

**使用页面**：AddressListPage, AddressEditPage, CheckoutPage, DeliveryTrackingPage

---

### 6. 空状态 (Empty State)

居中：SVG 插画 + Tais 分隔线 + 标题 + 描述 + CTA 按钮。`max-w-[300px]`。

**使用页面**：CartPageEmpty, ProfileEmptyPage

---

### 7. 文化元素 (Cultural Elements)

| 子模式 | 实现方式 | 使用页面 |
|--------|---------|---------|
| Tais Pattern | CSS gradient/SVG 背景纹理叠加 | 几乎所有页面头部 |
| Diamond Pattern | CSS gradient 45deg 对角菱形 | SplashPage, auth 页面 |
| Logo Badge | `clip-path` 菱形裁切 | SplashPage |
| Uma Lulik Cut | `clip-path` 尖底裁切 | auth 页面头部 |
| Uma Lulik Curve | `clip-path` 锯齿底边 | SearchPage |
| Uma Lulik Skyline | SVG 三角房屋行 + 金色圆点 | HomePage, OrderListPage |
| Tais Divider | SVG 菱形分隔线 | HomePage, CartPageEmpty, OrderListPage |
| Uma Lulik Silhouette | `clip-path` 三角剪影 | ProfilePage, AddressListPage |
| Uma Lulik Shadow | `box-shadow: 4px 4px 0px 0px` | ProductListPage, DeliveryTrackingPage |
| Header Pattern | 多层 gradient + SVG 三角 | HomePage, OrderListPage |
| Cultural Anchor | 2 列：灰度图 + 本地化文案 | auth 页面 |

---

### 8. 表单输入框 (Form Input)

两种变体：填充式（auth 页面，`bg-surface-variant/40`）和描边式（地址/资料页，`border border-outline-variant`）。特殊变体：手机号 +670 前缀、验证码 + 发送按钮。

**使用页面**：所有 auth 页面, AddressEditPage, ProfileEditPage

---

### 9. Banner 轮播 (Banner Carousel)

水平 snap 滚动，`h-[180px]` 卡片 + 背景图 + 渐变遮罩 + 标题 + CTA 按钮。分页点指示器。自动滚动 4s。

**使用页面**：HomePage

---

### 10. 分类网格 (Category Grid)

4 列圆形图标网格。`w-12 h-12 rounded-full` 彩色圆 + `font-label-caps text-[10px]` 标签。

**使用页面**：HomePage, CategoryPage

---

### 11. 状态标签页 (Status Tabs)

水平滚动 Tab 行。激活 `border-b-2 border-primary text-primary`，非激活 `border-transparent text-on-surface-variant`。

**使用页面**：OrderListPage, ProductDetailPage

---

### 12. 骨架屏 (Skeleton Loading)

shimmer 动画占位，`linear-gradient(90deg, #f7ddd9 25%, #fce2df 50%, #f7ddd9 75%)` + `animation: shimmer 1.5s infinite`。

**使用页面**：CategoryPage

---

### 13. 粘性底栏 (Sticky Footer / Action Bar)

固定底部操作栏，多种变体：结算栏、商品操作栏、双按钮栏、支付确认栏、表单保存栏。

**使用页面**：CartPage, CheckoutPage, ProductDetailPage, DeliveryTrackingPage, PaymentPage, PaymentResultPage, AddressEditPage

---

### 14. 数量选择器 (Quantity Selector)

水平内联控制：`-` 按钮 + 数量 + `+` 按钮。`bg-surface-container rounded-md`，按钮 `w-7 h-7 text-primary`。

**使用页面**：CartPage, CheckoutPage

---

### 15. 芯片/标签 (Chip/Tag)

三种变体：筛选芯片（激活 `bg-primary text-on-primary`）、商品标签（叠加在图片上）、状态徽章（带彩色圆点药丸）。

**使用页面**：SearchPage, SearchResultPage, CategoryPage, ProductDetailPage, OrderListPage, 所有商品卡片

---

### 16. 评分组件 (Rating)

星级评分显示，Material Symbols `font-variation-settings: 'FILL' 1/0`。两种变体：汇总评分（大数字 + 柱状图）和行内评分（星标行）。

**使用页面**：ProductDetailPage

---

### 17. 页面头部 (Page Header)

五种变体：主色 + Tais + Uma Lulik 过渡、主色 + 尖底裁切、主色 + 简单标题、主色 + Tab 导航、TopAppBar 风格。

**使用页面**：所有页面

---

## 附加模式

| # | 模式 | 使用页面 |
|---|------|---------|
| 18 | 时间线 (Timeline) | DeliveryTrackingPage |
| 19 | 徽章 (Badge) | 底部导航 Cart Tab, ProfilePage |
| 20 | 配送提示条 (Delivery Tip Bar) | HomePage, OrderListPage |
| 21 | 支付方式选择 (Payment Method Selector) | PaymentPage |
| 22 | 订单摘要卡片 (Order Summary Card) | PaymentPage, DeliveryTrackingPage |
| 23 | 功能菜单列表 (Function Menu List) | ProfilePage, ProfileEmptyPage |
| 24 | 用户信息卡片 (User Profile Card) | ProfilePage, ProfileEditPage, ProfileEmptyPage |
| 25 | 语言选择卡片 (Language Selection Card) | LanguageSelectPage |
| 26 | 进度指示器 (Progress Indicator) | SplashPage |
| 27 | 订单快捷入口网格 (Order Quick Entry Grid) | ProfilePage, ProfileEmptyPage |
| 28 | 促销快捷入口 (Promo Shortcuts) | HomePage |
