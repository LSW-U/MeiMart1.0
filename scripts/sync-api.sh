#!/usr/bin/env bash
# scripts/sync-api.sh
#
# 从后端 MeiMart repo 同步 API 契约到前端 MeiMart1.0
#
# 同步内容：
#   1. OpenAPI YAML（packages/api-contract/openapi.yaml）→ apps/<app>/api/openapi.yaml
#   2. TS 类型（packages/shared-types/src/generated/*.ts）→ apps/<app>/api/types/
#
# 用法：
#   bash scripts/sync-api.sh              # 同步到所有 app
#   bash scripts/sync-api.sh client-app   # 只同步到 client-app
#   bash scripts/sync-api.sh rider-app    # 只同步到 rider-app
#
# 前置：
#   1. 后端 MeiMart repo 在本地（默认路径见 BACKEND_ROOT 变量）
#   2. 后端已跑过 pnpm --filter @meimart/api-contract gen:openapi + pnpm --filter @meimart/shared-types gen:types
#      若没跑，本脚本会自动跑
#
# 决策依据：W2 三流程协作规范 §跨 repo 协作（不发 npm、不用 submodule，纯 cp）

set -euo pipefail

# ========== 配置（按需调整）==========
BACKEND_ROOT="${BACKEND_ROOT:-/Users/linsuwei/code/Work/MeiMart}"
FRONTEND_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# ====================================

OPENAPI_SRC="$BACKEND_ROOT/packages/api-contract/openapi.yaml"
TYPES_SRC="$BACKEND_ROOT/packages/shared-types/src/api-types.ts"

echo "🔍 后端 repo: $BACKEND_ROOT"
echo "🔍 前端 repo: $FRONTEND_ROOT"
echo

# 检查后端 repo 是否存在
if [ ! -d "$BACKEND_ROOT" ]; then
  echo "❌ 后端 repo 不存在: $BACKEND_ROOT"
  echo "   设置 BACKEND_ROOT 环境变量指向后端 MeiMart repo 本地路径"
  exit 1
fi

# 检查后端是否需要重新生成 artifacts
if [ ! -f "$OPENAPI_SRC" ] || [ ! -f "$TYPES_SRC" ]; then
  echo "⚠️  后端 artifact 缺失，自动跑 gen:openapi + gen:types..."
  cd "$BACKEND_ROOT"
  pnpm --filter @meimart/api-contract gen:openapi
  pnpm --filter @meimart/shared-types gen:types
  cd "$FRONTEND_ROOT"
  echo
fi

if [ ! -f "$OPENAPI_SRC" ]; then
  echo "❌ OpenAPI 生成失败: $OPENAPI_SRC 不存在"
  exit 1
fi
if [ ! -f "$TYPES_SRC" ]; then
  echo "❌ TS 类型生成失败: $TYPES_SRC 不存在"
  exit 1
fi

# 目标 app 列表
APPS=()
if [ $# -gt 0 ]; then
  APPS=("$@")
else
  for d in "$FRONTEND_ROOT"/apps/*; do
    [ -d "$d" ] && APPS+=("$(basename "$d")")
  done
fi

echo "📦 准备同步到 app: ${APPS[*]}"
echo

# 同步函数
sync_to_app() {
  local app=$1
  local app_dir="$FRONTEND_ROOT/apps/$app"
  local api_dir="$app_dir/api"

  if [ ! -d "$app_dir" ]; then
    echo "⚠️  跳过 $app（目录不存在）"
    return
  fi

  mkdir -p "$api_dir"

  # 1. OpenAPI YAML
  cp "$OPENAPI_SRC" "$api_dir/openapi.yaml"
  echo "  ✓ openapi.yaml   → apps/$app/api/openapi.yaml"

  # 2. TS 类型（单文件 api-types.ts）
  cp "$TYPES_SRC" "$api_dir/api-types.ts"
  echo "  ✓ api-types.ts   → apps/$app/api/api-types.ts"

  # 3. 写一个版本戳（git 可追溯上次同步时间）
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "$api_dir/.last-sync"
  cd "$BACKEND_ROOT"
  BACKEND_SHA=$(git rev-parse --short HEAD)
  cd "$FRONTEND_ROOT"
  echo "$BACKEND_SHA" > "$api_dir/.backend-sha"
  echo "  ✓ 版本戳         → backend_sha=$BACKEND_SHA"
}

for app in "${APPS[@]}"; do
  echo "=== 同步到 $app ==="
  sync_to_app "$app"
  echo
done

echo "🎉 同步完成"
echo
echo "下一步："
echo "  - 在 app 代码中 import ' in app 代码中导入类型，例如：import type { paths } from './api/api-types'"
echo "  - 用 openapi.yaml 加载到 swagger viewer 或 code generator"
echo "  - git add apps/*/api/ commit 这次同步"
