# MeiMart1.0 前端 Monorepo

MeiMart（东帝汶超市电商）前端仓库：**两个独立 App**，各自打包、各自发布，不合并。

| App | 目录 | 包名 | 说明 |
|---|---|---|---|
| 顾客端 | `apps/client-app` | `mei-mart-app` | React Native + Expo + expo-router，4 语言（en/zh/id/pt + tet） |
| 骑手端 | `apps/rider-app` | `mei-delivery-app` | React Native + Expo，配送任务/位置上报 |

后端仓库（NestJS）在另一个 repo：`/Users/linsuwei/code/Work/MeiMart`，契约通过 `scripts/sync-api.sh` 同步（见下）。

## 环境要求

- **Node 22**（`engines: >=22 <23`，根 package.json 已锁）
- **pnpm 11**（`corepack enable` 或 `npm i -g pnpm`）

## 安装

```bash
git clone <本仓库>
cd mei-mart-app
pnpm install --config.node-linker=hoisted
```

> ⚠️ **必须带 `--config.node-linker=hoisted`**：pnpm 11 在 workspace 模式下**不读根 `.npmrc`** 的 `node-linker` 配置（已知坑，见 git log `686e582`）。不带此 flag 会装成 isolated 布局，hoisted 解析链断——client tsc 会报 `expo-constants` 等 5 处 TS2307。CI 里同款命令见 `.github/workflows/ci.yml`。

## 常用命令

全部在**仓库根**执行（`-F` 按包名过滤：`mei-mart-app` = client，`mei-delivery-app` = rider）：

```bash
# 安装 / 同步依赖
pnpm install --config.node-linker=hoisted

# 类型检查
pnpm -F mei-mart-app typecheck        # client
pnpm -F mei-delivery-app typecheck    # rider

# Lint
pnpm -F mei-mart-app lint             # client（expo lint）
pnpm -F mei-mart-app lint:fix
pnpm -F mei-delivery-app lint         # rider（eslint --max-warnings 0）

# 测试
pnpm -F mei-mart-app test             # client jest
pnpm -F mei-delivery-app test         # rider jest（rn + web 双 project）
pnpm -F mei-mart-app check:i18n       # i18n key 三语一致性（python 脚本）
pnpm -F mei-mart-app check:a11y       # a11y 静态检查

# 起 dev server（Metro）
pnpm -F mei-mart-app start
pnpm -F mei-delivery-app start
```

也可以进各自目录用 `npx`：`cd apps/client-app && npx tsc --noEmit && npx jest --ci`。

## 契约同步（对接后端）

```bash
bash scripts/sync-api.sh              # 同步到所有 app
bash scripts/sync-api.sh client-app   # 只同步 client-app
bash scripts/sync-api.sh rider-app    # 只同步 rider-app
```

- 同步内容：后端 `openapi.yaml` + `api-types.ts` → 两 app 的 `apps/<app>/api/`
- 前置：后端 repo 在本地（默认 `/Users/linsuwei/code/Work/MeiMart`，可用 `BACKEND_ROOT` 环境变量覆盖），且后端已跑 `gen:openapi` + `gen:types`（没跑脚本会自动跑）
- `.backend-sha` 记录同步时的后端 commit，是同步状态的真实来源

## 环境变量

每个 app 一份 `.env`（git 忽略），模板见各自 `.env.example`：

| App | 文件 | key |
|---|---|---|
| client-app | `.env` / `.env.staging` / `.env.production` | `EXPO_PUBLIC_APP_ENV` / `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_USE_MOCK` / `EXPO_PUBLIC_SENTRY_DSN`（+ `SENTRY_DISABLE_AUTO_UPLOAD` 等本地构建开关） |
| rider-app | `.env` | `EXPO_PUBLIC_API_BASE_URL` |

client 的 env 管道：`.env` 的 `EXPO_PUBLIC_*` → Expo 构建时注入 `process.env` → `app.config.ts` 映射回 `extra.*` → 代码读 `Constants.expoConfig?.extra`（见 `apps/client-app/app.config.ts`）。

EAS 相关占位（`projectId` / `owner` / `updates.url` 等）在 `app.json` 里标了 `TODO-[需用户]`，等账号信息补齐，**不要填假值**。

## 目录结构

```
mei-mart-app/
├── apps/
│   ├── client-app/        # 顾客端（expo-router，app/ 目录即路由）
│   └── rider-app/         # 骑手端
├── scripts/
│   └── sync-api.sh        # 后端契约同步
├── pnpm-workspace.yaml    # 根 workspace（packages: apps/*）
├── .npmrc                 # node-linker=hoisted（Expo/RN 需要；install 时仍需显式 flag）
└── package.json           # overrides + engines
```
