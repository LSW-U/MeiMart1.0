# Mei Delivery App - 骑手端目录规范

> React Native + Expo Router + TypeScript + NativeWind + tRPC + Zustand + WatermelonDB
> 与 `mei-mart-app`（客户端）共享 monorepo / 设计 Token / API Schema
> 业务定位：骑手接单、导航、取货、送达签收、收入提现

---

## 📐 原型映射表（raw HTML → Expo Router 路由）

| 原型文件 (raw-pages) | 路由路径 | 说明 |
|---|---|---|
| `SplashPage.html` | `app/index.tsx` | 启动页（鉴权 + 在岗状态判断） |
| `auth/DeliveryAuthLoginPage.html` | `app/(auth)/login.tsx` | 骑手登录 |
| `auth/RegjsterPage.html`(原文件拼写保留) | `app/(auth)/register.tsx` | 骑手注册 |
| `task/DeliveryTaskListPage.html` | `app/(main)/tasks.tsx` | 任务大厅（Tab） |
| `task/DeliveryTaskDetailPage.html` | `app/task/[id].tsx` | 任务详情（抢单） |
| `task/DeliveryTaskOngoingPage.html` | `app/task/[id]/ongoing.tsx` | 进行中任务 |
| `task/DeliveryTaskNavigatePage.html` | `app/task/[id]/navigate.tsx` | 导航页 |
| `task/DeliveryPickupConfirmPage.html` | `app/task/[id]/pickup.tsx` | 取货确认 |
| `task/DeliveryTaskSignConfirm.html` | `app/task/[id]/sign.tsx` | 送达签收 |
| `user/DeliveryProfilePage.html` | `app/(main)/profile.tsx` | 个人中心（Tab） |
| `user/DeliveryProfileEditPage.html` | `app/profile/edit.tsx` | 资料编辑 |
| `user/DeliveryEarningsPage.html` | `app/(main)/earnings.tsx` | 收入页（Tab） |
| `user/DeliveryWithdrawalPage.html` | `app/earnings/withdraw.tsx` | 提现 |
| `user/DeliveryOrderHistoryPage.html` | `app/order/history.tsx` | 历史订单 |
| `user/DeliverySettingsPage.html` | `app/settings/index.tsx` | 设置 |

> 📌 命名转换规则（与客户端保持一致）
> - 去掉 `Delivery` 前缀和 `Page.html` 后缀
> - PascalCase → kebab-case：`DeliveryPickupConfirm` → `pickup`
> - 详情页用动态路由 `[id].tsx`
> - 主底部 Tab 页面放进 `(main)` 分组

---

## 📁 完整目录结构

```text
mei-delivery-app/
├── app/                                # Expo Router 页面目录
│   ├── _layout.tsx                    # 根布局（Provider、状态栏、全局监听）
│   ├── index.tsx                      # 启动页 SplashPage
│   │
│   ├── (auth)/                        # 认证分组
│   │   ├── _layout.tsx
│   │   ├── login.tsx                  # 骑手登录（对应 DeliveryAuthLoginPage）
│   │   └── register.tsx               # 骑手注册（对应 RegjsterPage）
│   │
│   ├── (main)/                        # 主页面分组（底部 Tab 导航）
│   │   ├── _layout.tsx                # Tab 布局：任务/收入/我的
│   │   ├── tasks.tsx                  # 任务大厅（DeliveryTaskListPage）
│   │   ├── earnings.tsx               # 收入概览（DeliveryEarningsPage）
│   │   └── profile.tsx                # 个人中心（DeliveryProfilePage）
│   │
│   ├── task/                          # 任务/配送作业流模块
│   │   ├── [id].tsx                   # 任务详情（DeliveryTaskDetailPage）
│   │   └── [id]/
│   │       ├── ongoing.tsx            # 进行中（DeliveryTaskOngoingPage）
│   │       ├── navigate.tsx           # 导航（DeliveryTaskNavigatePage）
│   │       ├── pickup.tsx             # 取货确认（DeliveryPickupConfirmPage）
│   │       └── sign.tsx               # 签收（DeliveryTaskSignConfirm）
│   │
│   ├── order/                         # 历史订单模块
│   │   └── history.tsx                # 历史订单（DeliveryOrderHistoryPage）
│   │
│   ├── earnings/                      # 收入与提现模块
│   │   └── withdraw.tsx               # 提现（DeliveryWithdrawalPage）
│   │
│   ├── profile/                       # 个人中心子页
│   │   └── edit.tsx                   # 资料编辑（DeliveryProfileEditPage）
│   │
│   └── settings/                      # 设置
│       └── index.tsx                  # 设置（DeliverySettingsPage）
│
├── src/
│   ├── components/                    # 组件库
│   │   ├── ui/                        # 基础组件（沿用客户端设计语言）
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── SwipeButton.tsx        # 滑动确认（取货/送达专用）
│   │   │   └── index.ts
│   │   │
│   │   ├── business/                  # 骑手业务组件
│   │   │   ├── TaskCard.tsx           # 任务大厅卡片
│   │   │   ├── TaskDetailHeader.tsx   # 任务详情头部
│   │   │   ├── OrderTimeline.tsx      # 配送时间轴
│   │   │   ├── PickupChecklist.tsx    # 取货清单
│   │   │   ├── CountdownTimer.tsx     # 配送倒计时
│   │   │   ├── OnlineSwitch.tsx       # 上线/下线开关
│   │   │   ├── EarningCard.tsx        # 收入卡片
│   │   │   ├── EarningChart.tsx       # 收入趋势图
│   │   │   ├── WithdrawForm.tsx       # 提现表单
│   │   │   └── HistoryItem.tsx        # 历史订单条目
│   │   │
│   │   ├── map/                       # 地图相关
│   │   │   ├── MapView.tsx
│   │   │   ├── RouteLine.tsx          # 路径线
│   │   │   ├── RiderMarker.tsx
│   │   │   ├── ShopMarker.tsx
│   │   │   ├── CustomerMarker.tsx
│   │   │   ├── NavigationLauncher.tsx # 唤起第三方导航（高德/Google Map）
│   │   │   └── LocationTracker.tsx    # 后台定位上报
│   │   │
│   │   ├── camera/                    # 相机/扫码/签字
│   │   │   ├── PhotoCapture.tsx       # 拍照（取货/送达取证）
│   │   │   ├── QrScanner.tsx          # 取货码扫描
│   │   │   └── SignaturePad.tsx       # 电子签字
│   │   │
│   │   ├── layout/                    # 布局组件
│   │   │   ├── StatusBar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── TabBar.tsx
│   │   │   └── SafeAreaWrapper.tsx
│   │   │
│   │   └── feedback/                  # 反馈组件
│   │       ├── EmptyState.tsx
│   │       ├── ErrorState.tsx
│   │       ├── LoadingOverlay.tsx
│   │       ├── OfflineBanner.tsx
│   │       ├── NewOrderAlert.tsx      # 新单弹窗（震动 + 语音播报）
│   │       └── Toast.tsx
│   │
│   ├── services/                      # API 层
│   │   ├── trpc.ts                    # tRPC 客户端配置
│   │   ├── api.ts                     # RESTful 客户端（axios 实例）
│   │   ├── auth.ts                    # 认证 API
│   │   ├── task.ts                    # 任务大厅 / 抢单 API
│   │   ├── delivery.ts                # 配送过程上报（取货/导航/签收）
│   │   ├── order.ts                   # 历史订单 API
│   │   ├── earnings.ts                # 收入与提现 API
│   │   ├── location.ts                # 定位上报 API
│   │   ├── upload.ts                  # 文件上传（照片、签字）
│   │   └── user.ts                    # 用户/骑手资料 API
│   │
│   ├── store/                         # 状态管理（Zustand）
│   │   ├── useAuthStore.ts            # 登录态
│   │   ├── useRiderStore.ts           # 骑手在线状态 / 当前任务
│   │   ├── useTaskStore.ts            # 任务大厅缓存
│   │   ├── useEarningsStore.ts        # 收入缓存
│   │   ├── useLocationStore.ts        # 实时定位
│   │   └── useAppStore.ts             # 全局配置（语言、主题等）
│   │
│   ├── database/                      # 离线数据库（WatermelonDB）
│   │   ├── schema.ts                  # 表结构
│   │   ├── models/                    # Task / Order / LocationLog
│   │   └── sync.ts                    # 离线→在线同步策略
│   │
│   ├── hooks/                         # 自定义 Hooks
│   │   ├── useAuth.ts
│   │   ├── useCurrentTask.ts          # 当前进行中的任务
│   │   ├── useNetwork.ts              # 网络状态
│   │   ├── useOfflineQueue.ts         # 离线操作队列（弱网兜底）
│   │   ├── useLocation.ts             # 定位 Hook
│   │   ├── useBackgroundTask.ts       # 后台任务（定位上报）
│   │   └── useDebounce.ts
│   │
│   ├── i18n/                          # 多语言（与客户端一致）
│   │   ├── index.ts
│   │   ├── locales/
│   │   │   ├── en.json
│   │   │   ├── tet.json               # 德顿语
│   │   │   ├── pt.json                # 葡萄牙语
│   │   │   └── id.json                # 印尼语
│   │   └── useTranslation.ts
│   │
│   ├── theme/                         # 主题（与客户端共享 Token）
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   │
│   ├── utils/                         # 工具函数
│   │   ├── format.ts                  # 格式化（金额、距离、时长）
│   │   ├── validation.ts              # 表单校验
│   │   ├── storage.ts                 # 本地存储封装
│   │   └── constants.ts               # 常量定义
│   │
│   └── types/                         # TypeScript 类型定义
│       ├── task.ts
│       ├── order.ts
│       ├── rider.ts
│       ├── earnings.ts
│       └── common.ts                  # 通用类型（分页、响应等）
│
├── assets/                            # 静态资源
│   ├── images/
│   │   ├── logo.png
│   │   ├── splash.png
│   │   └── patterns/                  # Tais纹样等文化图案
│   ├── fonts/
│   │   ├── NotoSerif/
│   │   └── PlusJakartaSans/
│   └── icons/
│
├── app.json                           # Expo配置
├── tailwind.config.js                 # NativeWind配置（共享设计Token）
├── tsconfig.json
├── package.json
├── babel.config.js
├── metro.config.js
└── README.md
```

---

## 🎯 与客户端项目对齐点

| 层级 | 和 `mei-mart-app` 对齐规范 |
|------|----------------------------|
| 路由分组 | 登录相关放 `(auth)`，底部 Tab 页放 `(main)` |
| 组件分层 | `ui/` 基础组件 → `business/` 业务组件 → `layout/` 布局组件 → `feedback/` 反馈组件 |
| API 分层 | `src/services/` 按业务划分模块，`trpc.ts` / `api.ts` 统一配置 |
| 状态管理 | Zustand 单文件单 Store，按业务拆分 |
| 多语言 | 4 种语言 `en/tet/pt/id`，类型安全翻译 Hook |
| 主题 | `colors/typography/spacing` 抽离，和客户端共享设计 Token |

---

## 🚀 后续迁移说明

给 Claude Code 的迁移参考指令：
1. 读取此文件的「原型映射表」
2. 扫描原始 HTML 文件，输出确认 mapping
3. 创建目录骨架 → 再逐个迁移转换
4. 保持 HTML 原型的视觉结构，转换为 React Native + NativeWind
