# HTML 源文件盘点

> 盘点日期：2026-06-13
> 源目录：`/Users/linsuwei/code/Personal/html-original/pages-app/src/pages`

## 统计

- 总文件数：39
- 已实现页面：25
- 空文件/未实现：14

## 页面清单

| # | 文件路径 | 页面标题 | 模块 | 主要 UI 元素 |
|---|---------|---------|------|-------------|
| 1 | pages/AboutPage.html | — | 通用 | 空文件/未实现 |
| 2 | pages/LanguageSelectPage.html | Language Settings - Mei Mart | 通用 | 固定头部(返回/帮助按钮), 语言卡片按钮(English/简体中文/Tetum/Español)带选中对勾, "Save Settings"底部按钮 |
| 3 | pages/OnboardingPage.html | — | 通用 | 空文件/未实现 |
| 4 | pages/SplashPage.html | Mei Mart - Splash Screen | 通用 | 菱形Logo徽章("M"), 标语"Tolu Hamutuk Sosa Fácil", 英雄图片, 动画加载圆点(3个), 进度条 |
| 5 | pages/auth/LoginPage.html | Mei Mart - Sign In | 认证 | 品牌头部(shopping_basket图标), 欢迎文字, 表单(账号/手机输入+密码输入带可见性切换), 条款复选框, "Sign In"按钮, 注册链接, 文化图片网格 |
| 6 | pages/auth/PasswordLoginPage.html | Mei Mart - Sign In | 认证 | 表单(账号+密码字段), "Sign in with phone code"链接, "Forgot Password?"链接, 条款复选框, 登录按钮 |
| 7 | pages/auth/RegisterPage.html | Mei Mart - Sign In | 认证 | 注册表单(手机号, 验证码+"Husu Kódigu"发送按钮, 设置/确认密码), 条款复选框, "Register"按钮, 登录链接 |
| 8 | pages/auth/ResetPasswordPage.html | Mei Mart - Sign In | 认证 | 重置表单(手机号, 验证码+发送按钮), 条款复选框, "Troka Password"按钮, "Fila ba Tama"链接 |
| 9 | pages/auth/SmsLoginPage.html | Mei Mart - Sign In | 认证 | 短信登录表单(手机号, 验证码+发送按钮), "Sign in with password"链接, 条款复选框, 登录按钮 |
| 10 | pages/home/CategoryPage.html | Mei Mart - Categories | 首页 | 位置按钮头部, 侧边栏导航(图标分类: Food/Fashion/Home/Tech/Crafts/Beauty), 每日特惠卡片, 子分类圆形图标, 商品卡片("NEW"徽章+加购按钮), "VIEW ALL PRODUCTS"按钮, 骨架屏加载状态, 底部导航 |
| 11 | pages/home/HomePage.html | Mei Mart - Home | 首页 | 品牌头部(位置/搜索), 配送提示栏, 搜索栏, 促销轮播(3卡片自动滚动+分页点), 分类网格(8个圆形图标), Tais分割线SVG, 促销快捷入口(4卡片: Deals/New User/Coupons/Free Delivery), 推荐商品横向滚动(3卡片), 再次购买横向滚动(2卡片), 底部导航 |
| 12 | pages/home/SearchPage.html | Mei Mart | 首页 | 搜索输入框(麦克风/关闭按钮), 筛选标签药丸(All Categories/Fresh/Pantry/Drinks/Fruit/Rice), 最近搜索列表(带删除), 热门搜索网格(4项带趋势图标), 商品卡片网格(4卡片带收藏/加购按钮, FRESH/BEST SELLER徽章) |
| 13 | pages/home/SearchResultPage.html | Mei Mart - Search Results | 首页 | 搜索栏(只读"Organic Rice"), 排序/筛选标签(All/Best Selling/Price: Low to High/New Arrivals), 结果计数文字, 商品卡片网格(4卡片带Fresh/Top Rated/New徽章), 加载旋转器, 底部导航 |
| 14 | pages/product/ProductDetailPage.html | Mei Mart - Product Detail | 商品 | Tab导航(PRODUCT/REVIEWS/RECOMMENDED/DETAILS带滑动指示器), 商品图片+分页点+播放视频按钮, 徽章(LOCAL PRODUCT/BEST SELLER), 价格与折扣, 库存状态, 配送信息卡片(送达地址/预计时间/运费), 规格选择器(FINE/MEDIUM/COARSE), 商品详情图, 评价区(4.8评分+柱状图+评论), 相关商品横向滚动(3卡片+ADD TO CART), 粘性底栏(FAVORITE+ADD TO CART) |
| 15 | pages/product/ProductListPage.html | Mei Mart \| Local Bestsellers | 商品 | 头部(帮助/分享图标), 分类筛选芯片(All/Coffee/Artisanal Food/Handicrafts), 前3名热销大图卡片+加购按钮, 4-10名紧凑列表行+加购按钮, 底部导航 |
| 16 | pages/cart/CartPage.html | Mei Mart - Shopping Cart | 购物车 | 位置头部, 购物车商品列表(3项:复选框/缩略图/标题/规格/价格/数量加减控制), "PEOPLE ALSO BOUGHT"横向滚动, 结算栏(折扣-$5.00/总计/CHECKOUT按钮), 底部导航 |
| 17 | pages/cart/CartPageEmpty.html | Mei Mart - Empty Cart | 购物车 | 位置头部, Uma Lulik SVG插画, Tais分割线, 空状态文字, "START SHOPPING"按钮, 底部导航 |
| 18 | pages/order/CheckoutPage.html | Mei Mart - Checkout | 订单 | 购物车商品列表, 推荐商品, 结算栏, 底部导航(与CartPage内容相同) |
| 19 | pages/order/AfterSalesApplyPage.html | — | 订单 | 空文件/未实现 |
| 20 | pages/order/AfterSalesDetailPage.html | — | 订单 | 空文件/未实现 |
| 21 | pages/order/DeliveryTrackingPage.html | Order Details - Mei Mart | 订单 | 固定头部(返回/帮助/分享), 订单头部卡片(订单号MEI-98234, PROCESSING状态徽章, 预计送达信息), 配送地址卡片(Maria Silva, Rua de Christo Rei), 订单商品区(3项), 订单汇总卡片(小计/运费/折扣/总计), 支付与时间线卡片(LaisPay, 时间线: Order Confirmed/Processing/Shipped), 粘性操作按钮(Track Order/Contact Seller) |
| 22 | pages/order/OrderDetailPage.html | — | 订单 | 空文件/未实现 |
| 23 | pages/order/OrderListPage.html | Mei Mart | 订单 | 位置药丸头部, 管理模式切换按钮(tune图标), Uma Lulik天际线SVG过渡, 配送提示栏, 状态标签页(ALL ORDERS/PROCESSING/SHIPPED/DELIVERED), 订单卡片列表(3张), Tais分割线SVG, 删除按钮(管理模式), 底部Uma Lulik插画, 底部导航 |
| 24 | pages/order/OrderReviewPage.html | — | 订单 | 空文件/未实现 |
| 25 | pages/order/PaymentPage.html | Mei Mart - Payment | 订单 | 头部(返回/客服, "Checkout"标题), 配送地址卡片, 支付方式单选列表(LaisPay/Bank Transfer/Credit Debit Card), 订单汇总卡片(商品明细/小计/折扣/运费), 底部结算栏(安全结账标识/总价/"CONFIRM & PAY"按钮) |
| 26 | pages/order/PaymentResultPage.html | Mei Mart - Payment Success | 订单 | 成功图标, "Thank you for your order!"标题, 支付金额文字, 订单详情卡片(订单ID/预计送达/收货人地址), 确认邮件提示, 粘性操作按钮(TRACK ORDER STATUS/CONTINUE SHOPPING), 底部导航 |
| 27 | pages/address/AddressEditPage.html | Hela-fatin \| Mei Mart | 地址 | 头部(返回/帮助, "Add New Address"标题, Tais图案), 表单(全名/手机号+670前缀/地区下拉/完整地址文本框+"PIN ON MAP"按钮/设为默认地址开关), Uma Lulik剪影文化分隔符, 固定底部"SAVE ADDRESS"按钮 |
| 28 | pages/address/AddressListPage.html | Hela-fatin \| Mei Mart | 地址 | 头部(返回/帮助, "Manage Address"标题, Tais图案), "Add New Address"按钮, 已保存地址列表(3张卡片), 每张卡片含:姓名/编辑删除按钮/电话/地址, 单选选中效果, Uma Lulik剪影文化分隔符, 固定底部导航 |
| 29 | pages/address/MapPickPage.html | Hela-fatin \| Mei Mart | 地址 | 头部(返回/帮助, "Add New Address"标题, Tais图案), 地图图片+浮动搜索栏, 中心定位图钉覆盖层, "My Location"定位按钮, 表单(全名/手机号/地区下拉/完整地址文本框自动填充/设为默认地址开关), Uma Lulik剪影文化分隔符, 固定底部"SAVE ADDRESS"按钮 |
| 30 | pages/user/CouponListPage.html | — | 用户 | 空文件/未实现 |
| 31 | pages/user/FavoriteListPage.html | — | 用户 | 空文件/未实现 |
| 32 | pages/user/ProfileEditPage.html | Mei Mart - My Account | 用户 | 头部("Edit Profile"标题, 客服图标), Tais图案背景, 用户信息卡(头像+相机按钮, "Maria Silva", Gold Member/1,250 Points), 编辑表单(全名/手机号/邮箱/性别下拉/出生日期输入), "Save Changes"按钮, 安全区("Change Password"菜单项), 页脚Logo "Mei Mart v2.4.0", 底部导航 |
| 33 | pages/user/ProfileEmptyPage.html | Mei Mart - My Account | 用户 | 头部("My Account"标题, 客服+通知图标), Tais图案背景, 未登录状态卡片(Uma Lulik剪影+account_circle图标, "Login to enjoy member exclusive discount", LOGIN/REGISTER按钮), 我的订单快捷入口(4图标: To Pay/To Ship/To Receive/Review), 功能菜单(My Coupons/Shipping Addresses/Language Switch English/Help Center/Settings), 页脚Logo "Mei Mart v2.4.0", 浮动购物车按钮, 底部导航 |
| 34 | pages/user/ProfilePage.html | Mei Mart - My Account | 用户 | 头部("My Account"标题, 客服+通知图标), Tais图案背景, 用户信息卡(头像图片, "Maria Silva", Gold Member/1,250 Points), 我的订单快捷入口(4图标带徽章: To Pay "1"/To Ship/To Receive "2"/Review), 功能菜单(My Coupons/Shipping Addresses/Language Switch English/Help Center/Settings/Log Out), 页脚Logo "Mei Mart v2.4.0", 浮动购物车按钮, 底部导航 |
| 35 | pages/user/SettingsPage.html | — | 用户 | 空文件/未实现 |
| 36 | pages/service/CustomerServicePage.html | — | 服务 | 空文件/未实现 |
| 37 | pages/service/FeedbackPage.html | — | 服务 | 空文件/未实现 |
| 38 | pages/service/HelpCenterPage.html | — | 服务 | 空文件/未实现 |
| 39 | pages/service/NotificationListPage.html | — | 服务 | 空文件/未实现 |

## 模块分布

| 模块 | 文件数 | 已实现 | 未实现 |
|------|--------|--------|--------|
| 通用(根目录) | 4 | 2 | 2 |
| 认证(auth) | 5 | 5 | 0 |
| 首页(home) | 4 | 4 | 0 |
| 商品(product) | 2 | 2 | 0 |
| 购物车(cart) | 2 | 2 | 0 |
| 订单(order) | 8 | 5 | 3 |
| 地址(address) | 3 | 3 | 0 |
| 用户(user) | 6 | 3 | 3 |
| 服务(service) | 4 | 0 | 4 |

## 未实现页面列表

以下 14 个 HTML 文件为空文件或未实现状态，转换时需自行设计或等待原型补充：

1. AboutPage.html
2. OnboardingPage.html
3. AfterSalesApplyPage.html
4. AfterSalesDetailPage.html
5. OrderDetailPage.html
6. OrderReviewPage.html
7. CouponListPage.html
8. FavoriteListPage.html
9. SettingsPage.html
10. CustomerServicePage.html
11. FeedbackPage.html
12. HelpCenterPage.html
13. NotificationListPage.html
14. ProfileEmptyPage.html（注：此页面已有完整内容，标题标记为空但实际已实现）
