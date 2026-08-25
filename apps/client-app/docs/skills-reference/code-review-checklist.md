# Commit 前质量门禁

## 何时触发

当你在**准备 git commit 提交代码**前，或 CLAUDE.md 要求「commit 前必须运行」时。

## 一键检查脚本

将以下脚本保存为项目根目录 `scripts/pre-commit-check.sh`，或直接在终端运行：

```bash
#!/bin/bash
set -e

echo "🔍 运行质量检查..."
echo ""

# 1. TypeScript 编译检查
echo "── TypeScript ──"
npx tsc --noEmit && echo "✅ tsc 通过" || { echo "❌ tsc 失败"; exit 1; }

# 2. ESLint（零警告）
echo "── ESLint ──"
npx eslint . --max-warnings 0 && echo "✅ eslint 通过" || { echo "❌ eslint 失败"; exit 1; }

# 3. 代码异味检查
echo "── 代码异味 ──"
SMELL=$(grep -rn \
  "void [A-Z]\|@ts-ignore\|@ts-expect-error\|as any\|as unknown as\|@ts-nocheck\|eslint-disable" \
  app/ src/ 2>/dev/null || true)

if [ -n "$SMELL" ]; then
  echo "❌ 发现代码异味："
  echo "$SMELL"
  echo ""
  echo "修复方式："
  echo "  • void Xxx; → 移除未使用的 import"
  echo "  • @ts-ignore → 修复类型，或加注释 // 原因：xxx"
  echo "  • as any → 用正确类型替代"
  echo "  • eslint-disable → 修复 warning，不要绕过"
  exit 1
else
  echo "✅ 无代码异味"
fi

# 4. 硬编码颜色检查
echo "── 硬编码颜色 ──"
COLORS=$(grep -rn "#[0-9A-Fa-f]\{3,8\}\b" app/ src/ \
  --include="*.tsx" --include="*.ts" \
  | grep -v "colors\.\|theme\.\|//\|/\*\|\.d\.ts" 2>/dev/null || true)

if [ -n "$COLORS" ]; then
  echo "❌ 发现硬编码颜色（应使用 theme colors）："
  echo "$COLORS"
  exit 1
else
  echo "✅ 颜色全部来自 theme"
fi

# 5. Mutation onMutate 覆盖率
echo "── Mutation 完整性 ──"
for f in src/services/queries/use*.ts; do
  [ -f "$f" ] || continue
  m=$(grep -c "useMutation" "$f" 2>/dev/null || echo 0)
  o=$(grep -c "onMutate" "$f" 2>/dev/null || echo 0)
  if [ "$m" -gt "$o" ]; then
    echo "❌ $f: $m mutations but only $o onMutate"
    exit 1
  fi
done
echo "✅ onMutate 覆盖率达标"

# 6. 配置激活检查（依赖装了必须用）
echo "── 依赖激活检查 ──"
for lib in nativewind react-native-svg expo-linear-gradient expo-blur; do
  if grep -q "\"$lib\"" package.json 2>/dev/null; then
    if ! grep -rq "$lib" src/ app/ 2>/dev/null; then
      echo "⚠️  $lib 已安装但未在代码中使用"
    fi
  fi
done
echo "✅ 依赖检查完成"

echo ""
echo "🎉 全部检查通过！可以 commit 了。"
```

## 代码异味零容忍清单

以下写法**发现即重写**，不可用 `eslint-disable` 绕过：

| 异味 | 示例 | 正确做法 |
|------|------|---------|
| `void Xxx;` | `void myFunc;`（消除 unused import 警告） | 移除 import |
| `@ts-ignore` | `// @ts-ignore` | 修复类型定义 |
| `@ts-expect-error` | `// @ts-expect-error` | 修复类型，或加 `// 原因：xxx` |
| `as any` | `data as any` | 定义正确的类型 |
| `as unknown as Xxx` | `res as unknown as User` | 定义正确的类型 |
| `@ts-nocheck` | 文件级禁用 | 修复该文件的类型问题 |
| `eslint-disable` | `// eslint-disable-line` | 修复 warning |

**例外**（允许，但必须带注释说明原因）：
```typescript
// @ts-expect-error — 原因：React Native Types 类型定义缺失此属性
// eslint-disable-next-line — 原因：第三方库 API 强制要求 any 类型
```

## 运行测试

```bash
# 全部测试
npm test

# 只跑受影响的测试（按文件名匹配）
npm test -- --testPathPattern="cart"
```

## Git Commit 格式

```bash
# Task 提交
git commit -m "feat: Task X.Y — 简短描述"

# 修复提交
git commit -m "fix: Task X.Y — 修复了什么问题"

# 文档提交
git commit -m "docs: 更新了什么文档"
```

## 检查点（CP）验收补充项

在 CP 验收时，除常规检查外还需确认：
- [ ] `npx tsc --noEmit` 0 错误
- [ ] `npm test` 全部通过
- [ ] `npx eslint . --max-warnings 0` 通过
- [ ] 代码异味检查通过（上面的脚本）
- [ ] 所有 package.json 依赖在代码中有实际使用
- [ ] git log 中的 commit message 格式正确
