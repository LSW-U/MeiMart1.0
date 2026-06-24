# 待激活依赖说明（CP-FIX-2.4）

> 这份文档记录了「跨 Phase 保留但当前未激活」的依赖。

## expo-updates（OTA 更新）

**当前状态**：装了但未在任何源码中 import 使用。

**保留理由**：Phase 7 EAS Build / OTA 配置时启用。届时需要在 `app/_layout.tsx` 或独立 `src/services/updates.ts` 中调用 `Updates.fetchUpdateAsync()` 检查更新。

**激活方式（Phase 7 引用）**：

```typescript
import * as Updates from 'expo-updates';

export async function checkForUpdate() {
  if (!Updates.isEnabled) return;
  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
    Updates.reloadAsync();
  }
}
```

**待配置**：

- EAS Project ID（`app.json` extra.eas.projectId）
- EAS Build 账号 + 项目创建

## expo-device（设备信息）

**当前状态**：装了但删除 `src/services/security.ts`（code-review-2026-06-21 阻塞项 #9）后无源码 import。

**保留理由**：
1. Expo SDK 56 默认推荐包，移除需要验证 SDK 重装/构建流程，本次 code review 修复不动
2. 将来真正接入越狱/Root 检测（如 `expo-application` + 第三方 jailbreak/root 库）时仍需 `isDevice` 字段判断模拟器

**激活方式（将来引用）**：

```typescript
import * as Device from 'expo-device';
const isEmulator = Device.isDevice === false;
```

## 已移除的依赖（CP-FIX-2.4 决策）

以下依赖曾装但未用，CP-FIX-2.4 已移除：

- `@shopify/flash-list` — 当前 FlatList 性能足够
- `expo-notifications` — 推送服务需要 EAS + APNs/FCM，Mock 模式用不上，未来需要时再装

## 跨 Phase 间接依赖（自动保留，无需激活）

以下依赖在 `package.json` 中但源码无直接 import，是被其他库间接引用的底层依赖，不需要激活：

- `expo-font` — 被 `@expo-google-fonts/*` 间接使用
- `expo-linking` — 被 `expo-router` 间接使用
- `expo-modules-core` — 所有 `expo-*` 包的基础
- `expo-dev-client` — 开发构建工具
- `expo-status-bar` — `expo-router` 自动渲染 `<ExpoStatusBar>` 时使用
- `react-dom` + `react-native-web` — Expo Web 必需
- `react-native-gesture-handler` + `react-native-screens` — 导航栈依赖
- `nativewind` + `tailwindcss` + `react-native-svg-transformer` — Task A.1 决策：作为「设计 Token 字典」保留，不激活即正确状态
