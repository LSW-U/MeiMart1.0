#!/bin/bash
# check-hardcoded-colors.sh — 扫描 src/ app/ 中的裸 hex 颜色
#
# 排除：
#   - src/theme/ 目录（token / 场景主题模块定义本身）
#   - 测试文件（*.test.*）
#   - app/preview/index.tsx（dev 主题展示页，hex 为有意陈列，等同 ErrorBoundary 自洽例外）
#   - 带「原因：xxx」尾注的行（单点设计强调色豁免，见 CLAUDE.md 规则 36 同源思路）
#   - 纯注释行（// 开头 或 * 开头）
#   - 基础黑白（#ffffff / #000000，允许裸用）
#
# 输出为空 = 干净；有输出 = 残留清单（需收口到 theme，或加「// 原因：xxx」尾注豁免）。
# 用法：bash scripts/check-hardcoded-colors.sh

cd "$(dirname "$0")/.."

grep -rEn '#[0-9a-fA-F]{6}' src/ app/ \
  --include='*.ts' --include='*.tsx' \
  | grep -vE '/theme/' \
  | grep -vE '\.test\.' \
  | grep -vE 'preview/index\.tsx' \
  | grep -viE '#ffffff|#000000' \
  | grep -vE '原因[:：]' \
  | grep -vE ':\s*//' \
  | grep -vE ':\s*\*' \
  | grep -vE '^[[:space:]]*/\*\*' \
  | grep -vE '/\*\*' \
  || true
