# 13 个空 HTML 页面推导实现策略（批次 D）

> 13 个 HTML 源文件为 0 字节，需参考同类非空页面 + 业务逻辑推导实现。
> 本文档作为 Task D.1-D.13 的执行依据。

## 同类参考映射

| 空页面               | RN 文件路径                        | 同类参考          | 推导依据                                   |
| -------------------- | ---------------------------------- | ----------------- | ------------------------------------------ |
| AboutPage            | `app/about.tsx`                    | SplashPage        | 品牌展示页，复用 Logo + 文化装饰           |
| OnboardingPage       | `app/onboarding.tsx`               | SplashPage        | 引导页 3-4 屏滑动，复用 Logo               |
| OrderDetailPage      | `app/order/[id].tsx`               | OrderListPage     | 订单详情，复用 OrderCard 样式 + 状态色     |
| OrderReviewPage      | `app/order/review.tsx`             | ProductDetailPage | 评价页，复用商品卡片 + 星级 + tais-pattern |
| AfterSalesApplyPage  | `app/order/after-sales-apply.tsx`  | CheckoutPage      | 售后表单页，复用地址选择 + 表单样式        |
| AfterSalesDetailPage | `app/order/after-sales-detail.tsx` | OrderDetailPage   | 售后详情，复用订单详情布局                 |
| CustomerServicePage  | `app/service/index.tsx`            | ProfilePage       | 客服入口，复用列表样式 + tais-pattern      |
| FeedbackPage         | `app/service/feedback.tsx`         | CheckoutPage      | 反馈表单页                                 |
| HelpCenterPage       | `app/service/help.tsx`             | ProfilePage       | FAQ 列表                                   |
| NotificationListPage | `app/service/notifications.tsx`    | OrderListPage     | 消息列表                                   |
| CouponListPage       | `app/coupons.tsx`                  | OrderListPage     | 卡片列表 + Tab 栏                          |
| FavoriteListPage     | `app/favorites.tsx`                | ProductListPage   | 商品网格                                   |
| SettingsPage         | `app/settings.tsx`                 | ProfilePage       | 设置项列表                                 |

## 通用视觉规范

每个页面都要遵守：

- **顶部**：用 `PrimaryHeader`（红色 tais-pattern，CP-FIX P1-3 已统一）
- **页面文件头注释**：`// ⚠️ 无 HTML 原型，参考 [同类页面] 推导实现，待设计确认`
- **图标**：用 `@expo/vector-icons` MaterialCommunityIcons / MaterialIcons
- **文化元素**：复用 `TaisPattern` / `TaisDivider` / `Logo` 组件
- **卡片**：用 `Card` 组件 + `shadowPresets.md`
- **空状态**：用 `EmptyState` 组件
- **错误态**：用 `ErrorState` 组件
- **i18n**：所有文案提取到 `src/i18n/locales/{zh,en,tet}.json`

## 每页待设计确认清单字段

每个页面在本文档下面对应章节列出：

- **主视觉元素**：Logo / 插图 / 主要交互元素
- **主色调**：默认用 `colors.primary`，如有特殊说明记录
- **关键交互**：按钮 / 跳转 / 手势
- **异常态**：空列表 / loading / error 展示方式
- **待确认**：需要设计稿明确的细节

## 视觉相似度要求

- 批次 D **不强求像素级相似度**（无 HTML 源）
- 要求：**功能可用 + 视觉风格与同类页面一致**（红色 primary header、tais-pattern 装饰、Card 阴影、图标到位）
- 每页 commit 时附 1-2 张截图（批次 D 全部完成后统一存档到 `docs/screenshots/`）

---

## Task D.1 — AboutPage

**同类参考**：SplashPage.html（370 行）

**待确认清单**：

- 主视觉：Logo 在页面顶部？居中位置？
- 文案：About 文案需要您提供中英文
- 是否有团队/版本号/官网链接？
- 底部是否需要「Contact Us」入口？

**默认实现**：Logo 居中 + TaisDivider + About 文案 placeholder + 版本号 v1.0.0

---

## Task D.2 — OnboardingPage

**同类参考**：SplashPage.html

**待确认清单**：

- 引导屏数量（3 / 4 屏）
- 每屏的标题 + 副文案 + 插图
- Skip 按钮位置
- 最后一屏 CTA 文案（"Get Started" / "立即体验"）

**默认实现**：3 屏滑动 + Logo + Welcome 文案 + Skip + Next + 最后一屏 Login/Register 入口

---

## Task D.3 — OrderDetailPage

**同类参考**：OrderListPage.html（含 OrderCard 的状态色 + tais-pattern）

**待确认清单**：

- 状态色映射（pending/paid/shipped/completed/cancelled）
- 操作按钮组（Cancel / Pay / Track / Review / Repurchase）
- 是否需要物流进度时间轴？

**默认实现**：PrimaryHeader + 状态大色块 + 商品列表 + 价格汇总 + 操作按钮 + 收货地址卡片

---

## Task D.4 — OrderReviewPage（已迁移到 RHF，本 Task 重点是视觉还原）

**同类参考**：ProductDetailPage.html（含星级 + 商品卡片样式）

**待确认清单**：

- 星级是否带 emoji？
- 评价标签是否与 mock 数据一致？
- 是否支持上传图片？

**默认实现**：商品卡片 + 5 星评分按钮 + 标签 Chip + 评价文本 + 提交按钮

---

## Task D.5 — AfterSalesApplyPage（已迁移到 RHF）

**同类参考**：CheckoutPage.html（地址卡片 + 商品卡片样式）

**待确认清单**：

- 申请类型选项（仅退款 / 退货退款 / 维修）
- 退款原因列表
- 是否需要上传图片凭证？
- 联系方式字段

**默认实现**：商品卡片 + 类型 Chip + 原因 Chip + 描述文本 + 提交

---

## Task D.6 — AfterSalesDetailPage

**同类参考**：OrderDetailPage（同 D.3）

**待确认清单**：

- 申请状态时间轴
- 退款金额展示
- 客服沟通入口

**默认实现**：PrimaryHeader + 状态卡片 + 商品 + 进度时间轴 + 退款金额 + 客服按钮

---

## Task D.7 — CustomerServicePage

**同类参考**：ProfilePage.html

**待确认清单**：

- 在线客服 / 电话 / 邮件 / FAQ 入口排列
- 工作时间显示
- 是否需要聊天界面？

**默认实现**：PrimaryHeader + 4 个服务入口卡片 + 工作时间 + 联系信息

---

## Task D.8 — FeedbackPage（已迁移到 RHF）

**同类参考**：CheckoutPage.html

**待确认清单**：

- 反馈类型选项
- 是否需要上传截图？
- 联系方式必填还是选填？

**默认实现**：PrimaryHeader + 类型 Chip + 内容多行输入 + 联系方式 + 提交

---

## Task D.9 — HelpCenterPage

**同类参考**：ProfilePage.html

**待确认清单**：

- FAQ 分类
- 联系客服入口
- 搜索功能

**默认实现**：PrimaryHeader + 搜索框 + 分类列表 + 热门 FAQ + 联系客服按钮

---

## Task D.10 — NotificationListPage

**同类参考**：OrderListPage.html

**待确认清单**：

- 通知类型（订单 / 促销 / 系统）
- 是否分组显示
- 已读/未读状态色

**默认实现**：PrimaryHeader + Tab 栏 + 通知卡片列表 + 已读/未读样式

---

## Task D.11 — CouponListPage

**同类参考**：OrderListPage.html

**待确认清单**：

- Tab 分类（未使用 / 已使用 / 已过期）
- 优惠券卡片视觉（金额 + 满减 + 有效期）
- 领取中心入口

**默认实现**：PrimaryHeader + Tab 栏 + 优惠券卡片 + 空状态

---

## Task D.12 — FavoriteListPage

**同类参考**：ProductListPage.html（含商品网格）

**待确认清单**：

- 网格 1 列 / 2 列？
- 是否支持批量管理（选中删除）
- 排序方式

**默认实现**：PrimaryHeader + 2 列商品网格 + 长按删除 + 空状态

---

## Task D.13 — SettingsPage

**同类参考**：ProfilePage.html

**待确认清单**：

- 设置项分组（账号 / 通知 / 隐私 / 关于 / 退出）
- 语言切换入口
- 主题切换（如有 dark mode）
- 清除缓存按钮

**默认实现**：PrimaryHeader + 分组设置项列表 + 退出登录按钮
