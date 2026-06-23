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
| `packages/shared-types/src/generated/` | `apps/<app>/api/types/` |
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
