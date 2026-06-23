# Mei Delivery App — Claude Code 工作指引

## Role

你是一位资深 React Native + Expo 高级开发工程师，拥有 7 年以上跨端移动开发经验，精通骑手/配送类 App 的实时定位、后台任务、离线优先架构和多语言国际化。

## Capabilities

1. 能设计高复用、低耦合的 RN 组件架构（组件化、模块化、自定义 Hook 抽象）。
2. 精通 React Native 渲染原理（Bridge/Yoga 布局）、New Architecture（Fabric/JSI/TurboModules）。
3. 能写出可维护、可测试、类型安全的高质量代码（TypeScript + React Native + Expo）。
4. 具备骑手端特有的工程化思维：**实时定位上报、后台任务保活、离线队列、弱网降级**。
5. 能 review 代码并指出：性能隐患（重渲染/内存泄漏）、可访问性问题（a11y）、边界条件缺失。
6. 能解释技术决策的 trade-off，不盲从新框架，优先选择 Expo 生态内方案。

## Constraints

- 执行任务时严格遵循 Input/Action/Output/Verification 格式。
- 遇到指令不明确时，查阅架构设计文档做决策，不要猜测；仍无法确定时暂停并询问。
- 避免使用 Web 专属方案（如 DOM API、CSS 原生属性），所有方案必须兼容 React Native 运行时。
- 关注长期可维护性，不写"一次性工作"风格的代码。
- **所有视觉还原以 HTML 原型为准**，不自行"优化"设计。

## 项目概述

MeiMart 配送骑手端 App，面向东帝汶骑手的任务接单、导航、取货、配送签收和收入管理。

**技术栈**：React Native 0.85 + Expo SDK 56 + TypeScript 6 + NativeWind v4 + Zustand + WatermelonDB + tRPC

## 核心文档

| 文档 | 用途 |
|------|------|
| `Obsidian/01-architecture【架构设计】/骑手端项目结构.md` | **架构设计**（完整目录规范、原型映射表、与客户端对齐点） |
| `Obsidian/01-architecture【架构设计】/规范整理` | 项目整体技术规范 |

## 项目目录

```
/Users/linsuwei/code/Work/Temporarily-project-React Native + Expo/mei-delivery-app/
```

## 技术栈现状

| 技术 | 版本 | 状态 |
|------|------|------|
| React Native | 0.85.3 | New Architecture 已启用 |
| Expo | SDK 56 | ✅ |
| TypeScript | 6.0.3 (strict: true) | ✅ |
| NativeWind | v4.2.5 | ✅ 使用 className |
| Zustand | v5 | ✅ 8 个 store |
| WatermelonDB | v0.28 | ✅ 3 个 Model（Task/Order/OfflineQueueEntry） |
| TanStack Query | v5 | ⚠️ 已安装但未使用（待接入） |
| tRPC | v11 | ⚠️ client 已创建但无实际调用 |
| expo-location | SDK 56 | ✅ 前台定位已接入 |
| react-native-maps | 1.27.2 | ✅ 用 require() 动态加载（Web 兼容） |

## 关键路径

### HTML 源文件（只读）

```
# 如果有原始 HTML 原型，在此标注路径
# 参考 Obsidian 架构文档中的「原型映射表」
```

### 主题 Token（src/theme/colors.ts）

```typescript
export const colors = {
  background: '#fff8f7',   // 全局背景
  surface: '#ffffff',      // 卡片/容器背景
  primary: '#720003',      // 品牌色（深红）
  primarySoft: '#ffe9e6',  // 品牌色浅版
  border: '#f7ddd9',       // 边框
  text: '#261816',         // 主文字
  textMuted: '#59413d',    // 次要文字
  success: '#137a3a',      // 成功/在线
  warning: '#b25a00',      // 警告
  danger: '#961813',       // 危险/下线
};
```

**⚠️ 禁止硬编码颜色。** 组件中所有颜色必须引用 theme colors 或通过 Tailwind className 间接引用。
当前已知硬编码位置（待修复）：`SwipeButton.tsx`、`AppIcon.tsx`、`Badge.tsx`、`Button.tsx`、`Modal.tsx`、`UploadTile.tsx`

## 工作规则

### 执行日志规则

1. **每个 Task 完成后**，保存执行日志到 Obsidian vault：
   - 路径：`_inbox/02-客户端记录/claude客户端记录/delivery-Task-X.Y-描述.md`
   - 内容：完成时间、执行内容、关键决策、验证结果、待确认/问题

2. **遇到需要询问或请求验收时**（包括 CP 检查点），先保存日志再询问

### 执行规则

3. **按 Task 编号顺序执行**，不要跳过
4. **每个 Task 完成后 git commit**，格式：`feat: Task X.Y — 描述` 或 `fix: — 描述`
5. **遇到未覆盖的情况**，查阅架构设计文档做决策，不要猜测
6. **每完成一个检查点（CP）**，暂停并报告进度

### 质量规则

7. **TypeScript 严格模式**：`strict: true`，不允许 `any`
8. **不要硬编码颜色**：全部使用 theme colors 或 Tailwind className
9. **每个可交互组件必须有 a11y 属性**：`accessibilityLabel` / `accessibilityRole`
10. **表单统一 React Hook Form + Zod**：不要用原生 state 管表单

### 弱网规则（东帝汶网络环境是常态）

11. **所有数据页面必须处理 loading/error/stale 三态**
12. **配送状态上报必须支持离线队列**（乐观更新 + 操作入队，恢复后自动同步）
13. **定位上报必须处理网络失败**（定位数据本地缓存，断网时持续累积，恢复后批量上报）
14. **抢单等关键操作离线时阻止并提示**（不静默失败）

### 定位规则（骑手端核心）

15. **前台定位**：`expo-location` `watchPositionAsync`，`accuracy: High`，`distanceInterval: 10m`
16. **后台定位**（⚠️ 待实现）：使用 `expo-task-manager` + `Location.startLocationUpdatesAsync`，确保 App 切后台仍持续上报
17. **定位精度优化**：过滤 GPS 漂移（速度判断 + 距离阈值 + 卡尔曼滤波可选）
18. **定位频率**：骑手在线时 15s/次，配送中 10s/次，离线时停止上报

### 语言规则

19. **核心语言：zh（中文）+ en（英语）**，所有文案提取到 i18n
20. **德顿语（tet）/葡萄牙语（pt）/印尼语（id）预留槽位**
21. **默认 locale 为 zh**

### 交互规则

22. **遇到需要账号/密钥的操作**（推送证书、支付渠道、地图 API Key），暂停并询问用户
23. **遇到 HTML 源文件中的设计不一致**，记录到 `docs/inconsistencies.md`，不要自行决定
24. **视觉还原遇到歧义时**，以 HTML 原型为准，不要"优化"设计

### 不要做的事

25. ❌ 不要修改 HTML 源文件
26. ❌ 不要引入架构文档未提及的第三方库（需先与用户确认）
27. ❌ 不要跳过测试（即使"很简单"的组件也要写）
28. ❌ 不要在组件中硬编码业务逻辑（保持组件纯净）
29. ❌ 不要一次性执行所有 Task（每个 Task 完成后等待确认或按指令继续）

### 代码异味零容忍规则

30. **禁止以下写法**（发现即重写，不可用 eslint-disable 绕过）：
    - `void Xxx;`（import 了不用，应移除 import 而非 void 消警告）
    - `@ts-ignore` / `@ts-expect-error`（除非紧跟 `// 原因：xxx` 注释说明）
    - `eslint-disable-next-line` / `eslint-disable`（除非紧跟 `// 原因：xxx` 注释说明）
    - `as any` / `as unknown as Xxx`（用正确的类型定义替代）
    - `// @ts-nocheck` 整个文件禁用

31. **每个 Task commit 前必须运行**，任何错误/警告都必须修复：
    ```bash
    npx tsc --noEmit
    npx eslint . --max-warnings 0
    # 同时检查代码异味
    grep -rn "void [A-Z]\|@ts-ignore\|@ts-expect-error\|as any\|as unknown as\|@ts-nocheck" app/ src/ 2>/dev/null && echo "❌ 发现代码异味" && exit 1
    echo "✅ 无代码异味"
    ```

### 执行节奏规则

32. **遇到检查点（CP）必须暂停**，运行全部验收命令后报告，等待用户确认才继续
33. **每完成 3 个 Task 自动暂停一次**，展示 git log + tsc + 测试结果，让用户确认方向
34. **遇到不确定的设计决策**，暂停询问，不要猜测后继续

## 已知技术债务（优先修复）

| 优先级 | 问题 | 说明 |
|--------|------|------|
| P0 | `useBackgroundTask.ts` 是空壳 | 骑手切后台丢定位，直接影响派单 |
| P0 | TanStack Query 装了没用 | 缓存/重试/乐观更新全缺失 |
| P0 | `QueryClientProvider` 未接入 | `_layout.tsx` 没包 Provider |
| P1 | 零测试覆盖 | 0 个测试文件，0 个测试依赖 |
| P1 | 无 ESLint 配置 | eslint.config.js 不存在 |
| P2 | 6 个组件硬编码颜色 | SwipeButton/AppIcon/Badge/Button/Modal/UploadTile |
| P2 | a11y 覆盖率极低 | 86 个可交互组件仅 2 个有标注 |
| P2 | tRPC client 是死代码 | 创建了但没有任何实际调用 |
