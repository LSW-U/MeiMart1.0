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
pnpm install
```

> `nodeLinker: hoisted` 已配置在根 `pnpm-workspace.yaml`（pnpm 10+ 的标准位置），普通 `pnpm install` 即可。
> 历史坑（已解决）：pnpm 11 workspace 模式不读根 `.npmrc` 的 `node-linker`（见 git log `686e582`），曾需 `--config.node-linker=hoisted` CLI flag；批次2 G 迁到 workspace.yaml 后 flag 已全部撤销、`.npmrc` 已删除。

## 常用命令

全部在**仓库根**执行（`-F` 按包名过滤：`mei-mart-app` = client，`mei-delivery-app` = rider）：

```bash
# 安装 / 同步依赖
pnpm install

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

EAS 构建配置（两端 `eas.json`）：三 profile 的 `EXPO_PUBLIC_*` env 已配齐（dev=localhost / preview=staging / production=生产域名+Sentry DSN）；`app.json` 的 `projectId`/`owner` 已填真实值，仅商店链接（`ios.appStoreUrl`/`githubUrl`）与 `eas.json` submit 段的 Apple 三件套留 `TODO-[需用户]`。

## 发布流程（M3）

打包走 `.github/workflows/release.yml`，**纯手动触发**（EAS 构建花额度，无自动触发）：

1. GitHub 仓库页 → **Actions** → 左侧选 **Release** → **Run workflow**
2. 选 `app`（client-app / rider-app）+ `profile`（preview=内测 APK / production=商店包），点 Run
3. `preview`：只 build，产物下载链接在 EAS 后台（也会贴到 run log）
4. `production`：build + 自动 submit 双商店；**submit secrets 未配时打 warning 跳过**（不红），产物留 EAS 后台手动提交

### GitHub Secrets 清单（仓库 Settings → Secrets and variables → Actions）

| Secret | 用途 | 必需性 |
|---|---|---|
| `EXPO_TOKEN` | EAS 访问令牌（`eas whoami` 用的 token，EAS 后台 → Account Settings → Access Tokens 创建） | **必需**（没有它 build 步直接失败） |
| `ANDROID_SERVICE_ACCOUNT_KEY` | Google Play service account JSON 全文（写出到 `credentials/google-service-account.json`） | production submit 需要 |
| `APP_STORE_API_KEY` / `APP_STORE_API_KEY_ID` / `APP_STORE_ISSUER_ID` | App Store Connect API key 三件套（.p8 内容 + key id + issuer id） | production submit 需要 |
| `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` | 构建期 sourcemap 上传（Sentry 后台 Settings → Auth Tokens 取） | 可选（缺省跳过上传不阻塞构建） |

两端 EAS 项目：client `@suweilin/mei-mart-app`（3742f83e）· rider `@suweilin/mei-delivery-app`（630c349f），projectId 已填进各自 `app.json`。

## 目录结构

```
mei-mart-app/
├── apps/
│   ├── client-app/        # 顾客端（expo-router，app/ 目录即路由）
│   └── rider-app/         # 骑手端
├── scripts/
│   └── sync-api.sh        # 后端契约同步
├── pnpm-workspace.yaml    # 根 workspace（packages: apps/* + nodeLinker: hoisted）
└── package.json           # overrides + engines
```
