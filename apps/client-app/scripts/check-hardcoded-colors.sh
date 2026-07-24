#!/bin/bash
# check-hardcoded-colors.sh — 扫描 src/ app/ 中的裸 hex 颜色
#
# 排除：
#   - src/theme/ 目录（token 定义本身）
#   - 测试文件（*.test.*）
#   - 注释行（// 开头 或 * 开头）
#   - 基础黑白（#ffffff / #000000，允许裸用）
#
# 输出为空 = 干净；有输出 = 残留清单（需收口到 theme，或加「原因：xxx」注释）。
#
# 注意：app/** 页面级裸 hex 留到第二步逐页优化，本脚本主要验证 src/components。
# 用法：bash scripts/check-hardcoded-colors.sh

cd "$(dirname "$0")/.."

grep -rEn '#[0-9a-fA-F]{6}' src/ app/ \
  --include='*.ts' --include='*.tsx' \
  | grep -vE '/theme/' \
  | grep -vE '\.test\.' \
  | grep -viE '#ffffff|#000000' \
  | grep -vE ':\s*//' \
  | grep -vE ':\s*\*' \
  || true
