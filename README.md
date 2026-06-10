# Mei Delivery App

React Native + Expo Router + TypeScript + NativeWind 骑手端原型项目，面向配送员的任务接单、取货、配送、签收和收益管理流程。

## 当前能力

- Expo Router 文件路由
- 主页面底部 Tab：Tasks / Earnings / Profile
- Tasks 页面内单页 Tab 切换：New Tasks / Pickups / Deliveries
- On Duty 本地开关
- 任务 Mock 数据服务化
- 任务状态模拟流转：available → accepted → delivering → completed
- 动态任务路由：`/task/[id]`、`/task/[id]/pickup`、`/task/[id]/ongoing`、`/task/[id]/navigate`、`/task/[id]/sign`

## Scripts

```bash
npm run start
npm run ios
npm run android
npm run web
npm run typecheck
```

## Structure

- `app/`：Expo Router 页面目录
- `app/(main)/tasks.tsx`：骑手任务首页，使用组件内状态实现任务 Tab 切换
- `app/task/[id]*`：任务详情、取货、配送中、导航、签收流程
- `src/components/`：基础组件、业务组件、地图、相机、布局和反馈组件
- `src/services/`：API 与业务服务入口，目前包含内存 Mock 任务服务
- `src/store/`：状态模块占位，当前未引入 Zustand/Redux
- `src/i18n/`：多语言文案
- `src/theme/`：颜色、字体和间距 Token
- `src/types/`：业务类型定义

## 开发说明

当前没有接入真实后端，任务数据来自 `src/services/task.ts` 的内存 Mock。刷新页面或重启应用后状态会重置。后续接后端时优先替换 service 层实现，页面结构可保持不变。
