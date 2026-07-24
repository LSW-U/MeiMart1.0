# MeiMart 客户端 — 设计方向盘点与设计系统文档

> 范围：只读盘点，未修改任何业务代码（`src/`、`app/`、HTML 原型、`App.tsx` 均未动）。
> 数据来源：`pages-app/src/pages/**/*.html`（HTML 原型）、`apps/client-app/src/theme/*`、`src/components/{cultural,ui,business,feedback,layout}`、`apps/client-app/locales/*`、`docs/design-preview.html`。
> 用法：本文是**方案稿**，第 4、7 节含设计建议（标注「建议」），不确定项一律列入第 7 节「待确认」，不自行拍板。

---

## 1. 当前设计 Token、组件与视觉元素盘点

### 1.1 色板（`src/theme/colors.ts`）

采用 Material Design 3 色板，源自 HTML 原型的 `<script id="tailwind-config">`。

| 角色 | Token | Hex（亮色） | 备注 |
| --- | --- | --- | --- |
| 品牌红 / 主操作 | `primary` | `#961813` | 东帝汶文化红，CTA、选中态 |
| 主容器 | `primary-container` | `#b83228` | 渐变第二停、深红底 |
| 正文/图标在主色上 | `on-primary` | `#ffffff` | |
| 文化金（配置层） | `tertiary` | `#634700` | 会员/文化强调，深金 |
| 文化金（装饰层） | `cultural.gold` | `#D4A030` | SVG/纹样描边用 |
| 中性灰 | `secondary` | `#5d5f5f` | 次级文字/图标 |
| 错误（M3） | `error` | `#ba1a1a` | |
| 错误（语义） | `semantic.error` | `#C62828` | 与 HTML 状态提示一致 |
| 警告（语义） | `semantic.warning` | `#F57C00` | **仅有 warning/error 两个语义色** |
| 背景 / 表面 | `background` / `surface` | `#fff8f7` | 暖粉白（非纯白） |
| 最高表面 | `surface-container-lowest` | `#ffffff` | 卡片白底应走这里，而非裸 `#fff` |
| 描边 | `outline` / `outline-variant` | `#8d706c` / `#e1bfba` | |
| 文化装饰色（其余） | `cultural.{warmWhite, orange, amber, splashBg, diamondRed}` | `#FAF7F2` / `#F97316` / `#F5BE4C` / `#FFF8F1` / `#a20513` | 非配置内联色 |

- 暗色主题 `darkColors` 按 M3 dark 规范**推导**而来（HTML 只声明 `darkMode:"class"` 未实现暗色样式）。
- **缺口（重要）**：theme 没有 `success`（成功/新鲜/可配送）和 `info`（进行中/已发货）语义色。后果见 §2.1。

### 1.2 字体（`typography.ts` + `commonPresets.ts`）

- 字体族：`NotoSerif`（标题 h1/h2/h3）+ `PlusJakartaSans`（正文/标签/价格），经 `@expo-google-fonts` 加载；字重通过名后缀（`-Bold`/`-SemiBold`）解析以兼容 Android。
- 8 档 type token，与 HTML `fontSize` 配置一一对齐：

| Token | 字体 | 字号/行高 | 字重 |
| --- | --- | --- | --- |
| `h1` | Serif | 32 / 1.2 | 700 |
| `h2` | Serif | 24 / 1.3 | 700 |
| `h3` | Serif | 20 / 1.4 | 600 |
| `body-lg` | Sans | 18 / 1.6 | 400 |
| `body-md` | Sans | 16 / 1.5 | 400 |
| `body-sm` | Sans | 14 / 1.5 | 400 |
| `label-caps` | Sans | 12 / 1.2 | 700，letter-spacing 0.05em |
| `price-display` | Sans | 20 / 1.0 | 700 |

### 1.3 间距 / 圆角（`spacing.ts`）

- 间距 8 档：`xs4 · sm8 · gutter12 · md16 · container-margin20 · lg24 · xl32 · xxl48`（HTML 另有 `unit:4px` 与 `xs` 重复，RN 已合并）。
- 圆角 7 档：`sm2 · DEFAULT4 · md6 · lg8 · xl12 · 2xl16 · full9999`。**RN 比 HTML 多**（HTML 只定义 DEFAULT/lg/xl/full）。

### 1.4 阴影（`shadowPresets.ts` + `spacing.ts`）

- RN 可用预设 5 个：`sm · md · lg · xl · umaLulik`（iOS `shadow*` + Android `elevation`）。
- `umaLulik` 是项目独有文化阴影（偏移 4,4 / 不模糊 / 暖灰 `#59413d`），翻译自 HTML `.uma-lulik-shadow`，是 order/tracking、product/list 的视觉签名。
- `spacing.ts` 里另有 6 条 CSS 字符串阴影（`floating-cart / bottom-nav / sticky-footer / checkout-bar / delivery-tracking / stamp-button`），仅供 web 翻译参考，**不可直接用于 RN StyleSheet**。
- 提供 `withShadow(preset, overrides)` 辅助函数。

### 1.5 渐变（`gradients.ts`，基于 expo-linear-gradient）

5 个预设：`primaryFade`（主色右淡出）、`emeraldFade`（翡翠绿，新人 banner）、`blueFade`（蓝，免运 banner）、`brand`（`#961813→#b83228` 纵向，按钮/品牌横幅）、`warmSurface`（暖白纵向）。

### 1.6 图标（`iconMapping.ts` + `components/ui/Icon`）

HTML 用 Material Symbols（snake_case），RN 用 `@expo/vector-icons` 的 MaterialCommunityIcons（kebab-case）。已建 ~70 项稳定映射表 `symbolToMc()`，未知项兜底 `circle-outline`。`Icon` 组件支持 `symbol`（HTML 风）与 `name`（RN 风）双入口。

### 1.7 组件清单

| 分类 | 目录 | 组件 |
| --- | --- | --- |
| 文化（7） | `components/cultural/` | `DecorativeCorner` · `DiamondPattern` · `Logo` · `LogoBadge` · `TaisDivider` · `TaisPattern` · `UmaLulikSkyline` |
| UI 原语（14） | `components/ui/` | `Avatar` · `Badge` · `Button` · `Card` · `Checkbox` · `Chip` · `Icon` · `Input` · `Modal` · `PriceText` · `SafeImage` · `SelectField` · `Skeleton` · `Switch` |
| 业务（16） | `components/business/` | `AddressCard` · `AuthShell` · `BannerCarousel` · `CartItemRow` · `CategoryGrid` · `CategoryItem` · `CouponCard` · `LocaleSwitch` · `NotificationItem` · `OrderCard` · `ProductCard` · `PromoShortcut` · `ReviewItem` · `SearchBar` · `StatusBadge` · `TimelineStep` |
| 状态/反馈（8+1） | `components/feedback/` | `EmptyState` · `ErrorBoundary` · `ErrorState` · `LoadingOverlay` · `OfflineBanner` · `PageErrorBoundary` · `PageSkeleton` · `Toast`（+ `ToastContainer`） |
| 布局 | `components/layout/` | `PrimaryHeader`（及其余 header，见规则 40：`ProfileHeader` 等） |

视觉元素覆盖度：SVG 走 `react-native-svg`；图标走 `@expo/vector-icons`；阴影走 `shadowPresets`；渐变走 `expo-linear-gradient`。**`expo-blur` 已在依赖中（见 §7 待确认是否激活使用）**。

### 1.8 色彩使用现状（取样）

- `Button`（`ui/Button/Button.tsx`）：干净走 theme——`primary / on-primary / secondary-container / outline`。✅
- `Card`（`ui/Card/Card.tsx`）：`surface-container-low` + `outline-variant`，`elevated` 时用 `on-surface` 阴影。✅
- `TaisPattern`（`cultural/TaisPattern/TaisPattern.tsx`）：`colors.cultural.gold` 驱动 SVG 圆点。✅（但还原度低，见 §2.3）

---

## 2. 现有不一致

### 2.1 硬编码颜色（根因：theme 缺 success/info 语义色）

由于 theme 只有 `warning/error`，组件被迫硬编码「成功绿/信息蓝/待处理琥珀」。按严重度归类：

**A. 状态/徽章色硬编码（最严重，跨多文件）**
- `src/lib/orderStatusConfig.ts`：待处理琥珀 `#fef3c7 / #b45309 / #f59e0b`、已发货蓝 `#dbeafe / #1d4ed8 / #3b82f6`——订单状态 pill 配色完全在 lib 里写死，未进 theme。
- `src/components/business/ProductCard/ProductCard.tsx:13-17`：徽章调色板写死——`fresh:#059669`(emerald) · `best-seller:#961813` · `new:#634700` · `top-rated:#f59e0b`(amber) · `local:rgba(150,24,19,.1)`。
- `src/components/business/BannerCarousel/BannerCarousel.tsx:29-31`：自备 banner 调色板 `primary:#961813 / emerald:#065f46 / blue:#1d4ed8`，与 `gradientPresets` 逻辑重复。

**B. 错误态硬编码红（未走 `semantic.error`）**
- `feedback/ErrorBoundary/ErrorBoundary.tsx:50,55,60` 与 `feedback/PageErrorBoundary/PageErrorBoundary.tsx:79,87,91`：`#fef2f2 / #dc2626 / #991b1b` 三档红写死。

**C. 裸 `#ffffff` 泛滥（应走 `on-primary` / `surface-container-lowest`）**
- `layout/PrimaryHeader`（多处）、`business/SearchBar:46`、`business/AuthShell`、`business/StatusBadge:50`、`ui/SafeImage:49,72`（`#bdbdbd`/`#f5f5f5` 占位灰）、`cultural/DecorativeCorner:35`。

> 结论性建议（详见 §4、§7）：把 success(绿)/info(蓝)/warning(琥珀) 正式纳入 `semantic`，并把订单状态色、徽章色集中到 theme 或 config，消除散落 hex。

### 2.2 硬编码英文 / i18n 缺口

- **`ui/Button/Button.tsx:73`**：`accessibilityLabel="Loading"` 硬编码英文，未走 `t('common.loading')`。
- **`orderStatusConfig`** 的 label 只有 `{zh, en}`（`OrderCard.tsx:12` 注释自述「tet fallback 到 en」）——缺 tet。
- **`locales/tet.json` 全空**（约 550 个 key 全空字符串），**唯独 `checkout.orderFailed` 泄漏了一句未审校德顿语** `"La han pedidu la konsege."`——来源不明，需审校或清空。
- HTML 原型本身基本是英文（`lang="en"`，如 "Your Items"、"Ermera Premium Coffee"），属源稿性质；RN 侧通过 i18n 翻译，不算违规。
- 代码中 58 处中文字符串经核查**几乎全是注释**（合规）+ 少量测试 fixture（`有机野蜂蜜` 等，可接受），**未见用户可见的硬编码中文泄漏到 UI**。i18n 覆盖整体良好。

### 2.3 文化组件 vs HTML 原型差异

- **Tais 纹样还原度不足**：`cultural/TaisPattern` 是「金色圆点矩阵」（SVG `<Pattern>` + `r=0.5` 圆点）；而 HTML 原型与 `docs/design-preview.html` 的 Tais 是**红+金锯齿带**（`repeating-linear-gradient` 红/金条纹 + `clip-path` 三角形 polygon）。RN 现实现丢掉了红金条纹与几何感，仅剩点缀。`TaisDivider` 是否补足了带状纹样需进一步核对（列入 §7）。
- **方向稿全程德顿语**（见 §3、§5），与项目「默认 zh + tet 空壳」规则存在身份冲突。
- **三处「金」色并存，语义不清**：方向稿 `--gold:#b77b13`、theme `tertiary:#634700`、theme `cultural.gold:#D4A030`——三种金各不相同，未定义各自角色。

### 2.4 HTML 原型缺陷（影响迁移基准）

- **13 个 0 字节空文件**（按规则 31 需登记，不可凭空补）：
  `AboutPage`、`OnboardingPage`、`order/{AfterSalesApply,AfterSalesDetail,OrderDetail,OrderReview}`、`service/{CustomerService,Feedback,HelpCenter,NotificationList}`、`user/{CouponList,Favorite,Settings}`。
- **`order/CheckoutPage.html` 是残页**：`<title>` 与 meta 声明是 Checkout，但 body 完全是购物车（"Your Items" + cart-item + checkbox + qty），**无地址/配送/支付/订单摘要**。真正的结算设计只存在于 `docs/design-preview.html`（checkout 屏）。RN 侧 `app/order/checkout.tsx` 的 i18n key（`section.deliveryAddress/paymentMethod/orderSummary`、`summary.*`）显示 RN 已实现正确语义。
- **`order/DeliveryTrackingPage` 有 3 个版本**（v1 / `DeliveryTrackingPage2` / `DeliveryTrackingPage3`），未指明哪个为准。

---

## 3. 五个关键页面的区块清单

> 区块顺序 = 从上到下。HTML 缺失处用「（HTML 缺）」标注，并给出 RN/方向稿的应有结构。

### 3.1 首页（`home/HomePage.html` + 方向稿 home 屏）

HTML 版：① Status Bar → ② Sticky Header（位置/搜索入口）→ ③ **Uma Lulik Skyline 过渡带**（文化）→ ④ Delivery Tip → ⑤ Search Bar → ⑥ Banner Carousel（3 卡：Weekly Market / New User Gift / Free Delivery + 分页点）→ ⑦ Category Grid → ⑧ **TaisDivider** → ⑨ Promo Shortcuts → ⑩ Recommended Products（横向滚动）→ ⑪ Bottom Nav。

方向稿 home 屏：顶栏（菱形 M logo + 购物车）→ 位置胶囊「Entrega ba Bairro Pite」→ 搜索 → 配送可达条（绿点 + 时段 + 免运门槛）→ 「Olá, Maria」+ Hero（Kafé Timor）→ 分类（emoji 圆圈 8 个）→ **Tais 锯齿带** → 推荐（2 个商品卡）→ 底部 4 Tab。

> 差异：方向稿更突出「配送能力先讲」（首屏即给时段/免运门槛），分类用 emoji 而非图片，底栏 4 Tab 而非 5 Tab。

### 3.2 商品详情（`product/ProductDetailPage.html`）

① Top AppBar → ② Sliding Indicator → ③ 商品图轮播（4:5，分页点，视频 Play 按钮）→ ④ Content Canvas：Header Info（标题/价格/评分）→ ⑤ Delivery Section（配送时段/免运）→ ⑥ Variant Selector（规格选择）→ ⑦ Product Details → ⑧ Customer Reviews（含示例评论）→ ⑨ Related Products → ⑩ 底部操作栏（收藏 + 加购）。

### 3.3 购物车（`cart/CartPage.html`，另见 `CartPageEmpty.html`）

① Status Bar → ② Header → ③ 「Your Items」+ 件数 → ④ cart-item 列表（圆形 checkbox / 方图 / 名称 / 规格 / 价格 / 数量步进器）→ ⑤ **Tais Divider** → ⑥ Recommendations（猜你喜欢）→ ⑦ Checkout Bar（动态合计）→ ⑧ Bottom Nav。空态走 `CartPageEmpty.html`。

### 3.4 结算（HTML 残页；以方向稿 checkout 屏 + RN i18n key 为准）

HTML 缺（§2.4）。应有结构：① 结算顶栏（红渐变，FINALIZA PEDIDU）→ ② 收货地址卡（姓名/电话/地标+街区）→ ③ 配送选择（时段 + 「骑手临近时电话确认」）→ ④ 支付方式（单选，如 LaisPay）→ ⑤ 订单摘要（商品/运费/合计，免运用绿）→ ⑥ 底部确认栏（金额 + KONFIRMA & SELU）。弱网下提交应阻断并提示（项目规则 12）。

### 3.5 订单追踪（`order/DeliveryTrackingPage.html`）

① Status Bar → ② Top Header → ③ Order Header Card → ④ Delivery Address Card → ⑤ Order Items（item1/2/3）→ ⑥ Order Summary Card → ⑦ Payment & Timeline Card（时间线 + Step1 / Step2(active) / Step3）→ ⑧ Sticky Action Buttons。

---

## 4. 可复用 UI 规则（建议稿，待审）

> 标「现状」= 已有实现；标「建议」= 需要决策。带 ⚠️ 的进 §7。

### 4.1 色彩角色

| 角色 | 用色 | 现状/建议 |
| --- | --- | --- |
| 行动 / 品牌 | `primary #961813` | 现状：CTA、选中、价格 |
| 文化 / 会员 | `tertiary #634700` + `cultural.gold #D4A030` | 现状；建议：装饰用 `cultural.gold`，文字/会员用 `tertiary`，**明确区分**（⚠️ 方向稿 `#b77b13` 归并见 §7） |
| 成功 / 新鲜 / 可配送 | （无）⚠️ | 建议：新增 `semantic.success`，收口 `ProductCard.fresh:#059669`、方向稿「Livre」绿、订单完成态 |
| 信息 / 进行中 | （无）⚠️ | 建议：新增 `semantic.info`，收口 `orderStatusConfig` 已发货蓝 `#1d4ed8` |
| 警告 / 待处理 | `semantic.warning #F57C00` + 琥珀 `#f59e0b` | 建议：统一到 warning，收口订单待处理琥珀 |
| 错误 | `semantic.error #C62828` | 建议：`ErrorBoundary` 系列改用此色，删 `#dc2626/#991b1b` |
| 表面 | `surface #fff8f7`（暖粉白） | 卡片白底走 `surface-container-lowest #ffffff`，**禁止裸 `#fff`** |

### 4.2 间距

- 页面水平 padding：`container-margin(20)`；卡片内 padding：`sm(8)`/`md(16)`；区块垂直间距：`md(16)`/`lg(24)`；列表项 gap：`sm(8)`/`gutter(12)`。
- 触控热区统一用 `defaultHitSlop`（≥44px，WCAG 2.2），不各自写 `hitSlop={8}`。

### 4.3 圆角

- 卡片：`lg(8)` 或 `xl(12)`；图片缩略：`md(6)`；胶囊/标签：`full`；按钮：`8`（与 HTML `rounded-lg` 对齐）。模态/底部抽屉可用 `2xl(16)`。

### 4.4 阴影

- 卡片轻阴影：`sm`/`md`；浮动栏（底栏、结算栏）：`lg` + 可叠加品牌色 `shadowColor`；模态/弹层：`xl`；**文化戳记**：`umaLulik`（项目签名，order/tracking/product-list 专用）。禁止在业务组件里手写 `shadowColor/shadowOffset/...` 散落值。

### 4.5 按钮

- 现状（`ui/Button`）：variant `primary/secondary/outline/text`，size `sm36/md44/lg52`，含 loading/disabled/fullWidth，最小高 44。
- 建议：删除/危险操作目前无专用 variant ⚠️（是否加 `danger`？见 §7）；加载态 `Button.tsx:73` 的 `"Loading"` 改走 i18n；CTA 是否用 `brand` 渐变需定（⚠️）。

### 4.6 标签 / 徽章

- 现状：`ProductCard` 自带 5 种徽章配色（fresh/best-seller/new/top-rated/local，硬编码）；`StatusBadge` 接收 `backgroundColor` prop（调用方传 hex）。
- 建议：徽章语义 → theme 角色（fresh=success / best-seller=primary / new=tertiary / top-rated=warning / local=primary 透明底），`StatusBadge` 改为接「状态名」而非裸色，收口 `orderStatusConfig` 的散落 hex。

### 4.7 空状态

- 现状：`feedback/EmptyState` 已存在并被 `coupons/favorites/address/list/search/results` 等列表页使用。
- 规则：所有列表页三态（空/错/加载）必须用 `EmptyState`/`ErrorState`/`PageSkeleton`，空态含插画位 + 主 CTA；空态文案走 i18n（`*.empty / emptyDesc / goShopping` 等 key 已具备）。

### 4.8 弱网状态

- 现状：`feedback/OfflineBanner` + `LoadingOverlay`；React Query `networkMode:'offlineFirst'`；写操作乐观更新（项目规则 10-13、25-26）。
- 规则：购物车写操作乐观更新 + 入队；支付/评价/结算提交在离线时**阻断并提示**（用 `OfflineBanner`/`offlineBlock` 文案，已具备 `cart.offlineBlock`、`checkout.offlineBlock/Desc`）；恢复后自动同步。

---

## 5. 需 Tetum（德顿语）母语审校的清单

> 方向稿是项目里**唯一**的德顿语实物来源，可作为 tet 词汇种子，但必须母语审校。

**A. 可从方向稿提取的 tet 词汇（需审校正字法）**
- 通用：Olá / Haree（看）/ Buka（找）/ Inísiu（首页）/ Pedidos（订单）/ Kontu（账户）/ Haree hotu（查看全部）
- 电商：kareta（购物车）/ Hatama ba kareta（加入购物车）/ Finaliza pedidu（完成订单）/ Konfirma & selu（确认并支付）/ LaisPay（支付方式名）/ fatin entrega（收货地址）/ forma pagamentu（支付方式）/ resumu pedidu（订单摘要）/ produtu lokál（本地产品）/ fresku（新鲜）/ hili tamanhu（选择规格）
- 品类：Modo（蔬菜）/ Hare（米）/ Kafé（咖啡）/ Ai-fuan（水果）/ Aihan（面包/食品）/ Tais / Seluk（其他）
- 地名/单位：Bairro Pite / Dili / Ermera / US$ / kg / 250g

**B. 需翻译/审校的范围**
- `locales/tet.json` 全部 ~550 key（当前空壳）——需母语逐条翻译，**不要机翻**。
- `orderStatusConfig` 的状态 label（当前 zh/en）——补 tet。
- `checkout.orderFailed` 那句已存在的 tet 字符串——审校或清空。
- 文化术语正字：Tais / Uma Lulik；是否保留葡萄牙借词（LaisPay、Bairro、Igreja）需统一政策。

**C. 审校注意**
- 方向稿里 "La han pedidu la konsege"（tet.json 中那句）语义/语法存疑，必须母语确认。
- 德顿语有 Tetun-Praça 与 Tetun-Terik 之别，需先定方言基准（⚠️ 列入 §7）。

---

## 6. （说明）

第 6 节原指令未单独要求内容；本节用作对上文「不一致」与下文「待确认」的衔接说明，不另立条款。

---

## 7. 待确认（不自行决定，需用户拍板）

1. **语义色补全**：是否正式新增 `semantic.success`(绿) 与 `semantic.info`(蓝)，并把 `orderStatusConfig`、`ProductCard` 徽章、`BannerCarousel`、`ErrorBoundary` 系列的散落 hex 全部收口进 theme？
2. **三种金的归并**：方向稿 `#b77b13` / theme `tertiary #634700` / `cultural.gold #D4A030`——分别承担什么角色？方向稿的金是否替换现有某一档？
3. **Tais 还原基准**：RN 现是「金点矩阵」，HTML/方向稿是「红金锯齿带」。是否升级 `TaisPattern`/`TaisDivider` 到条纹+几何？`TaisDivider` 现状需核对。
4. **语言身份**：方向稿是德顿语优先，项目规则是默认 zh + tet 空壳。是否转向「tet 优先」？还是方向稿仅作视觉探索、文案以 zh/en 为准？
5. **底栏 Tab 数**：方向稿 4 Tab（Inísiu/Buka/Pedidos/Kontu，无分类、无购物车入口）vs 现状 5 Tab（home/categories/cart/orders/account）。以哪个为准？
6. **结算页基准**：`CheckoutPage.html` 是残页（购物车副本）。结算设计以方向稿 checkout 屏 + RN `app/order/checkout.tsx` 为准？还是要求补 HTML 原型？
7. **DeliveryTracking 三版本**：v1 / `DeliveryTrackingPage2` / `DeliveryTrackingPage3` 以哪个为迁移基准？
8. **13 个空 HTML**：AboutPage / OnboardingPage / order(4) / service(4) / user(3) 的设计稿来源？（按规则 31 暂不凭空补。）
9. **`expo-blur` 是否已激活使用**：依赖在 `package.json`，需确认代码里有 `BlurView` 实际使用（CP2 配置激活检查），否则属「装了不用」。
10. **危险/删除操作按钮**：是否给 `Button` 加 `danger` variant（目前删除等操作无统一红色按钮规范）？CTA 是否采用 `brand` 渐变？
11. **`Button.tsx:73` 硬编码 "Loading"**：直接改走 `t('common.loading')` 即可，但属业务代码改动，不在本轮（只读）范围——登记待后续 Task 处理。
12. **德顿语方言基准**：Tetun-Praça 还是 Tetun-Terik？决定翻译与审校人选。
13. **暗色主题**：`darkColors` 为 M3 推导值，HTML 未实现暗色。是否保留暗色主题作为正式支持，还是先只做亮色？

---

## 附：盘点元信息

- 盘点日期：2026-07-23
- HTML 原型：共 41 文件，非空 28，空文件 13（含 `DeliveryTrackingPage2/3` 两个变体）。
- RN 组件：cultural 7 / ui 14 / business 16 / feedback 8+1 / layout(含 PrimaryHeader)。
- 本文未修改任何源码；交付后仅提交本文件。
