# Mei Delivery App

MeiMart 配送骑手端 — 面向东帝汶骑手的任务接单、导航、取货、配送签收和收入管理。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React Native | 0.85 | New Architecture 已启用 |
| Expo | SDK 56 | 路由、构建、OTA 更新 |
| TypeScript | 6.0 | strict 模式 |
| NativeWind | v4 | Tailwind 风格的样式系统 |
| Zustand | v5 | 客户端状态管理（8 个 store） |
| WatermelonDB | v0.28 | 离线数据库（Task/Order/OfflineQueue） |
| expo-location | SDK 56 | GPS 定位追踪 |
| react-native-maps | 1.27 | 地图与标记 |

## 当前能力

- ✅ Expo Router 文件路由，`(auth)` / `(main)` 分组
- ✅ 底部 Tab：任务大厅 / 收入 / 个人中心
- ✅ 完整任务流程：详情 → 抢单 → 取货确认 → 配送导航 → 送达签收
- ✅ 实时定位追踪（前台 `watchPositionAsync`，10m/15s 频率）
- ✅ 离线队列：配送状态上报支持离线累积，恢复后自动同步
- ✅ 网络状态检测：离线时展示 OfflineBanner
- ✅ 相机/扫码/签字：取货码扫描、送达拍照取证、电子签名
- ✅ 收入管理：收益概览、趋势图表、提现流程
- ✅ 多语言：zh/en/tet/pt/id 五种语言
- ✅ 倒计时、滑动确认等骑手专用交互组件
- ✅ Toast 通知系统

## Scripts

```bash
npm run start        # 启动 Metro
npm run ios          # iOS 模拟器
npm run android      # Android 模拟器/真机
npm run web          # Web 端（用于快速预览）
npm run typecheck    # TypeScript 类型检查
```

## 项目结构

```
mei-delivery-app/
├── app/                    # Expo Router 页面
│   ├── (auth)/             # 登录/注册
│   ├── (main)/             # Tab 页面（tasks/earnings/profile）
│   ├── task/[id]/          # 任务流程（详情/取货/配送/导航/签收）
│   ├── order/              # 历史订单
│   ├── earnings/           # 收入提现
│   ├── profile/            # 资料编辑
│   └── settings/           # 设置
├── src/
│   ├── components/         # 组件库
│   │   ├── ui/             # 基础组件（Button/Card/Input/Modal…）
│   │   ├── business/       # 业务组件（TaskCard/CountdownTimer…）
│   │   ├── map/            # 地图组件（MapView/Marker/RouteLine…）
│   │   ├── camera/         # 相机/扫码/签字
│   │   ├── layout/         # 布局（BottomNav/PageHeader…）
│   │   └── feedback/       # 反馈（Toast/EmptyState/OfflineBanner…）
│   ├── services/           # API 层（fetch 封装 + auth/任务/配送/收入…）
│   ├── store/              # Zustand 状态（8 个 store）
│   ├── database/           # WatermelonDB 离线数据库
│   ├── hooks/              # 自定义 Hooks（定位/网络/离线队列…）
│   ├── i18n/               # 多语言（zh/en/tet/pt/id）
│   ├── theme/              # 主题 Token（colors/spacing/typography）
│   ├── types/              # TypeScript 类型定义
│   └── utils/              # 工具函数
└── assets/                 # 字体、图标、图片
```

## 开发说明

### 环境变量

```bash
# .env（不提交到 git）
EXPO_PUBLIC_API_BASE_URL=https://your-api-url.com
```

### 后端对接

当前使用 fetch 封装（`src/services/api.ts`），包含：
- Auth token 自动注入（Bearer）
- 401 自动登出处理
- 统一错误处理（ApiError）

后端 API 尚未完全对接，部分数据来自 service 层的 Mock 实现。

## 已知限制

- ⚠️ **后台定位未实现**：`useBackgroundTask` 是空壳，App 切后台定位会中断
- ⚠️ **TanStack Query 未接入**：已安装但未使用，数据缓存/重试/乐观更新依赖手动管理
- ⚠️ **零测试覆盖**：无 jest 配置，无测试文件
- ⚠️ **部分组件硬编码颜色**：SwipeButton/AppIcon/Badge/Button/Modal/UploadTile

## 相关文档

- [骑手端项目结构](Obsidian: 01-architecture【架构设计】/骑手端项目结构.md) — 完整架构设计、原型映射表
- [CLAUDE.md](./CLAUDE.md) — Claude Code 工作指引
