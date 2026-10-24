# scripts/ — 跨 repo 工具脚本

## sync-api.sh

从后端 MeiMart repo 同步 API 契约到前端各 app。

### 用法

```bash
# 同步到所有 app（client-app + rider-app）
bash scripts/sync-api.sh

# 只同步到指定 app
bash scripts/sync-api.sh client-app
bash scripts/sync-api.sh rider-app
```

### 同步内容

| 来源（后端 MeiMart repo） | 目标（前端 app） |
|---|---|
| `packages/api-contract/openapi.yaml` | `apps/<app>/api/openapi.yaml` |
| 后端 git SHA | `apps/<app>/api/.backend-sha` |
| 同步时间戳 | `apps/<app>/api/.last-sync` |

### 前置条件

1. **后端 MeiMart repo 在本地**
   - 默认路径：`/Users/linsuwei/code/Work/MeiMart`
   - 自定义：`BACKEND_ROOT=/path/to/meimart bash scripts/sync-api.sh`

2. **后端已生成 artifacts**
   - 若缺失，脚本会自动跑：
     - `pnpm --filter @meimart/api-contract gen:openapi`
     - `pnpm --filter @meimart/shared-types gen:types`

### 何时跑

- 后端发布新版本契约（PR merge 后）
- 前端开发前确保类型最新
- 出现类型不匹配错误时

### 设计理由

跨 repo 共享 API 契约的方式（决策 2026-06-24）：
- ❌ npm 私包：需要 npm 账号 + publish 流程，对单人 MVP 太重
- ❌ git submodule：学习成本高，CI 集成麻烦
- ✅ **本地 cp 脚本**：简单直接，单人开发够用，零依赖

参考：`MeiMart` repo 的 `W2-COLLABORATION.md` §跨 repo 协作。

## budget-check.mjs（轻量化省流批3）

包体积预算门禁：`npx expo export --platform android` 产出 dist/ 后，解析 metadata.json 中 android JS bundle（hbc）字节数 vs 预算 **8.7MB**，超预算 exit 1。CI 在 `.github/workflows/ci.yml` 的 `size-budget` job 自动拦截。

基线口径（批3 P3-3 补注）：8.7MB = 8.5MB + 200KB 余量。其中 8,496,734 B 为批3 改动前基线（20261024 实测）；批3 落地后复核实测 8,500,600 B（SafeImage thumb 改造净增 ~3.8KB），仍在预算内。

### 用法

```bash
node scripts/budget-check.mjs                # 完整导出 + 校验（CI 用）
SKIP_EXPORT=1 node scripts/budget-check.mjs  # 复用既有 dist/（本地调试）
BUDGET_BYTES=8400000 node scripts/budget-check.mjs  # 反向验证：降阈值演示红
```

口径（方案v2 D3 拍板）：只管 JS bundle（hbc），字体/静态资产不在内。
