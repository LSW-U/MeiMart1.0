# HTML → RN 视觉还原

## 何时触发

当你在**将 HTML 原型页面转换为 RN 页面**时。

> ⚠️ 这是 MeiMart 项目踩过的最大坑：Claude 能让 133 个测试全过、0 个 TS 错误、0 个 ESLint 警告，但产出页面和 HTML 原型完全不像。这个 Skill 防止重蹈覆辙。

## Step 0：读 HTML 前先验证文件非空

```bash
# 每次读取 HTML 文件前，先检查大小
[ -s "$htmlPath" ] || echo "⚠️ 空文件，暂停询问"
```

遇到 0 字节文件：
1. **暂停**，不要凭空编造
2. 记录到 `docs/empty-html-files.md`
3. 询问用户提供设计稿来源

## Step 1：提取全部视觉元素（缺一不可）

转换前，从 HTML 中逐项提取以下元素清单：

### SVG 图形
```html
<!-- HTML 中 -->
<svg viewBox="0 0 100 100">
  <path d="M10 50 Q 50 10 90 50" stroke="#E63946" fill="none" />
</svg>
```
```typescript
// RN 中 → 用 react-native-svg 还原
import Svg, { Path } from 'react-native-svg';

<Svg viewBox="0 0 100 100" width={100} height={100}>
  <Path d="M10 50 Q 50 10 90 50" stroke="#E63946" fill="none" />
</Svg>
```
**不允许跳过 SVG 或用文字/emoji 替代。**

### 图标（Material Symbols / icon fonts）
```html
<i class="material-symbols-outlined">shopping_cart</i>
```
```typescript
import { MaterialIcons } from '@expo/vector-icons';

<MaterialIcons name="shopping-cart" size={24} color={colors.primary} />
```

### 阴影
```html
<div class="shadow-lg">...</div>
```
```typescript
// iOS + Android 双平台
import { Platform } from 'react-native';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  android: { elevation: 6 },
});
```

### 渐变
```html
<div class="bg-gradient-to-r from-red-500 to-orange-500">...</div>
```
```typescript
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={[colors.primary, colors.primaryLight]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={styles.gradient}
>
```

### 模糊/毛玻璃
```html
<div class="backdrop-blur-md">...</div>
```
```typescript
import { BlurView } from 'expo-blur';

<BlurView intensity={40} tint="light" style={styles.blur}>
```

### 文化元素（东帝汶特色）
MeiMart 的 HTML 原型包含东帝汶文化元素：
- **Tais 纹样** — 传统编织图案，在装饰边、分隔线、背景纹理中
- **Uma Lulik** — 传统神圣房屋轮廓，在 onboarding、about 页面
- **国旗配色** — 红/黑/黄/白

这些元素必须忠实提取，不可省略或"简化"。

## Step 2：行数比例检查

RN 页面（含样式）行数应 ≥ HTML 原型行数的 **30%**。

```bash
HTML_LINES=$(wc -l < "$htmlFile")
RN_LINES=$(wc -l < "$rnFile")
RATIO=$(echo "scale=2; $RN_LINES * 100 / $HTML_LINES" | bc)
echo "HTML: $HTML_LINES 行 → RN: $RN_LINES 行 (${RATIO}%)"

# 低于 30% → 视觉细节丢失
```

低于 30% 的处理：
- 如果是通过**组件复用**减少了行数 → 在文件顶部加注释说明：
  ```
  // 本页通过 [SharedHeader] 和 [ProductCard] 组件复用减少行数
  // HTML 行数: 511 → RN 行数: 180（复用率 65%）
  ```
- 如果不是复用 → **视觉细节丢失，必须补充**

## Step 3：设计 Token 提取

从 HTML 的 Tailwind config 提取 token，不要凭空编造：

```html
<script id="tailwind-config">
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: '#E63946',
          surface: '#FFFFFF',
        }
      }
    }
  }
</script>
```

→ 对照 `src/theme/colors.ts`，确保一致。如发现 HTML 与现有 theme 不符，记录到 `docs/inconsistencies.md`。

## Step 4：转换后自检清单

- [ ] 所有 SVG 已转为 `react-native-svg` 组件
- [ ] 所有图标已用 `@expo/vector-icons` 还原
- [ ] 所有阴影已用 Platform.select 实现双平台
- [ ] 所有渐变已用 `expo-linear-gradient`
- [ ] 所有模糊已用 `expo-blur`
- [ ] 行数比例 ≥ 30%（或有注释说明复用）
- [ ] 所有颜色来自 theme，无硬编码
- [ ] 文化元素（Tais/Uma Lulik）已提取
- [ ] 视觉元素与 HTML 原型逐项对照，无遗漏
