# 弱网行为标注

> 标注日期：2026-06-13
> 基于东帝汶网络环境（弱网/断网为常态）

## 标注说明

- `critical_data`：页面必须加载的数据，无此数据页面无意义
- `optional_data`：可延迟/降级的数据
- `offline_usable`：是否需要离线可访问
- `mutation_type`：用户可执行的操作及离线容忍度（`queueable`=可入队 / `block`=离线时阻止 / `none`=无写操作）

---

## 通用页面

| # | 页面 | critical_data | optional_data | offline_usable | mutation_type |
|---|------|--------------|---------------|----------------|---------------|
| 1 | SplashPage | 无（纯静态） | 无 | false | none |
| 2 | OnboardingPage | 无（纯静态） | 无 | false | none（完成后标记 onboardingCompleted） |
| 3 | LanguageSelectPage | 无（纯静态） | 无 | true | none（语言选择写本地存储，离线可操作） |
| 4 | AboutPage | 关于文本（可缓存） | 无 | true | none |

## 认证模块

| # | 页面 | critical_data | optional_data | offline_usable | mutation_type |
|---|------|--------------|---------------|----------------|---------------|
| 5 | LoginPage | 无（表单页） | 无 | false | block（登录需网络，离线阻止） |
| 6 | PasswordLoginPage | 无（表单页） | 无 | false | block（登录需网络，离线阻止） |
| 7 | SmsLoginPage | 无（表单页） | 无 | false | block（短信验证码需网络，离线阻止） |
| 8 | RegisterPage | 无（表单页） | 无 | false | block（注册需网络，离线阻止） |
| 9 | ResetPasswordPage | 无（表单页） | 无 | false | block（重置密码需网络，离线阻止） |

## 首页模块

| # | 页面 | critical_data | optional_data | offline_usable | mutation_type |
|---|------|--------------|---------------|----------------|---------------|
| 10 | HomePage | 推荐商品列表 | Banner 轮播、促销快捷入口、再次购买 | true | queueable（加购可离线入队） |
| 11 | CategoryPage | 分类列表、分类下商品 | 每日特惠 | true | queueable（加购可离线入队） |
| 12 | SearchPage | 热门搜索词（可缓存） | 最近搜索（本地存储） | true | none |
| 13 | SearchResultPage | 搜索结果商品列表 | 筛选标签 | true | queueable（加购可离线入队） |

## 商品模块

| # | 页面 | critical_data | optional_data | offline_usable | mutation_type |
|---|------|--------------|---------------|----------------|---------------|
| 14 | ProductDetailPage | 商品详情、价格、库存 | 评价列表、相关商品、配送信息 | true | queueable（加购可离线入队） |
| 15 | ProductListPage | 商品排行列表 | 分类筛选 | true | queueable（加购可离线入队） |

## 购物车模块

| # | 页面 | critical_data | optional_data | offline_usable | mutation_type |
|---|------|--------------|---------------|----------------|---------------|
| 16 | CartPage | 购物车商品列表、价格 | 推荐商品(PEOPLE ALSO BOUGHT) | true | queueable（数量修改/删除可离线入队） |
| 17 | CartPageEmpty | 无（空状态纯静态） | 无 | true | none |

## 订单模块

| # | 页面 | critical_data | optional_data | offline_usable | mutation_type |
|---|------|--------------|---------------|----------------|---------------|
| 18 | CheckoutPage | 购物车商品、结算金额 | 推荐商品 | true | block（下单需网络，离线阻止并提示） |
| 19 | PaymentPage | 支付方式列表、订单金额 | 无 | false | block（支付需网络，离线严格阻止） |
| 20 | PaymentResultPage | 支付结果（仅在线获取） | 无 | false | none（纯展示，不可操作） |
| 21 | OrderListPage | 订单列表 | 管理模式删除功能 | true | queueable（删除订单可离线入队） |
| 22 | OrderDetailPage | 订单详情 | 无 | true | none |
| 23 | DeliveryTrackingPage | 物流时间线 | 配送地址（可缓存） | true | none |
| 24 | AfterSalesApplyPage | 售后申请表单 | 无 | false | block（提交申请需网络） |
| 25 | AfterSalesDetailPage | 售后详情 | 无 | true | block（取消/申诉需网络） |
| 26 | OrderReviewPage | 订单商品列表 | 无 | false | block（提交评价需网络） |

## 地址模块

| # | 页面 | critical_data | optional_data | offline_usable | mutation_type |
|---|------|--------------|---------------|----------------|---------------|
| 27 | AddressListPage | 地址列表 | 无 | true | queueable（选择/删除地址可离线操作） |
| 28 | AddressEditPage | 无（表单页） | 地图定位 | true | queueable（保存地址可离线入队） |
| 29 | MapPickPage | 地图数据 | 定位信息 | false | queueable（地图需网络，保存地址可离线入队） |

## 用户模块

| # | 页面 | critical_data | optional_data | offline_usable | mutation_type |
|---|------|--------------|---------------|----------------|---------------|
| 30 | ProfilePage | 用户信息、订单快捷入口 | 功能菜单列表 | true | none（登出需网络但可离线清除本地） |
| 31 | ProfileEmptyPage | 无（未登录纯静态） | 无 | true | block（登录跳转需网络） |
| 32 | ProfileEditPage | 用户当前资料（可缓存） | 无 | true | queueable（保存修改可离线入队） |
| 33 | SettingsPage | 无（纯本地设置） | 无 | true | none |
| 34 | CouponListPage | 优惠券列表 | 无 | true | none |
| 35 | FavoriteListPage | 收藏列表 | 无 | true | queueable（取消收藏可离线入队） |

## 服务模块

| # | 页面 | critical_data | optional_data | offline_usable | mutation_type |
|---|------|--------------|---------------|----------------|---------------|
| 36 | CustomerServicePage | 客服会话消息 | 无 | false | block（发送消息需网络） |
| 37 | FeedbackPage | 无（表单页） | 无 | false | block（提交反馈需网络） |
| 38 | HelpCenterPage | 帮助文章（可缓存） | 无 | true | none |
| 39 | NotificationListPage | 通知列表 | 无 | true | none |

---

## 统计

| 指标 | 数量 |
|------|------|
| 总页面数 | 39 |
| offline_usable = true | 26 |
| offline_usable = false | 13 |
| mutation_type = queueable | 12 |
| mutation_type = block | 10 |
| mutation_type = none | 17 |

## 离线优先策略要点

1. **queueable 操作**：乐观更新 UI + 操作入离线队列，恢复网络后自动同步
2. **block 操作**：离线时禁用按钮/显示提示，不静默失败
3. **offline_usable = true 的页面**：优先返回缓存数据（`networkMode: 'offlineFirst'`），展示 stale 数据 + 可选刷新
4. **offline_usable = false 的页面**：必须在线，离线时显示"需要网络"提示
5. **支付类操作严格 block**：PaymentPage / CheckoutPage 离线时完全阻止，防止重复支付风险
