# Tailwind → React Native StyleSheet 翻译参考表

> 本文档记录 HTML 源文件中所有 Tailwind class 对应的 RN StyleSheet 写法。
> 翻译时请对照此表，确保色值/间距/阴影精确还原。

## 1. 颜色（BackgroundColor / Color）

| Tailwind class             | RN StyleSheet                                      | 主题 Key              |
| -------------------------- | -------------------------------------------------- | --------------------- |
| `bg-primary`               | `backgroundColor: colors.primary`                  | primary               |
| `bg-primary-container`     | `backgroundColor: colors['primary-container']`     | primary-container     |
| `bg-surface`               | `backgroundColor: colors['surface']`               | surface               |
| `bg-surface-container-low` | `backgroundColor: colors['surface-container-low']` | surface-container-low |
| `bg-background`            | `backgroundColor: colors.background`               | background            |
| `text-on-primary`          | `color: colors['on-primary']`                      | on-primary            |
| `text-on-surface`          | `color: colors['on-surface']`                      | on-surface            |
| `text-on-surface-variant`  | `color: colors['on-surface-variant']`              | on-surface-variant    |
| `text-primary`             | `color: colors.primary`                            | primary               |
| `text-error`               | `color: colors.error`                              | error                 |
| `text-success`             | `color: colors.success`                            | success               |
| `bg-cultural-gold`         | `backgroundColor: colors.cultural.gold`            | cultural.gold         |
| `bg-cultural-tais`         | `backgroundColor: colors.cultural.tais`            | cultural.tais         |

## 2. 阴影（Shadow）

Tailwind 的 `shadow-*` 在 RN 需拆分为 `shadowColor/shadowOffset/shadowOpacity/shadowRadius`（iOS）+ `elevation`（Android）。

**预设值**（建议放在 `theme/shadows.ts`）：

| Tailwind     | shadowRadius | shadowOpacity | shadowOffset.height | elevation |
| ------------ | ------------ | ------------- | ------------------- | --------- |
| `shadow-sm`  | 1.41         | 0.18          | 1                   | 1         |
| `shadow`     | 3            | 0.25          | 2                   | 3         |
| `shadow-md`  | 5            | 0.28          | 3                   | 5         |
| `shadow-lg`  | 9            | 0.30          | 4                   | 8         |
| `shadow-xl`  | 14           | 0.32          | 6                   | 12        |
| `shadow-2xl` | 22           | 0.34          | 9                   | 16        |

```typescript
// theme/shadows.ts
import { Platform } from 'react-native';
import { colors } from './colors';

export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.41,
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 5,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 9,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 12,
  },
};
```

## 3. 圆角（BorderRadius）

| Tailwind class | borderRadius |
| -------------- | ------------ |
| `rounded-none` | 0            |
| `rounded-sm`   | 2            |
| `rounded`      | 4            |
| `rounded-md`   | 6            |
| `rounded-lg`   | 8            |
| `rounded-xl`   | 12           |
| `rounded-2xl`  | 16           |
| `rounded-3xl`  | 24           |
| `rounded-full` | 9999         |

## 4. 间距（Padding / Margin / Gap）

| Tailwind class             | RN StyleSheet          | 主题 Key               |
| -------------------------- | ---------------------- | ---------------------- | ------ |
| `p-xs` / `px-xs` / `py-xs` | `padding(Horizontal    | Vertical): spacing.xs` | xs = 4 |
| `p-sm`                     | `padding: spacing.sm`  | sm = 8                 |
| `p-md`                     | `padding: spacing.md`  | md = 16                |
| `p-lg`                     | `padding: spacing.lg`  | lg = 24                |
| `p-xl`                     | `padding: spacing.xl`  | xl = 32                |
| `p-2xl`                    | `padding: spacing.xxl` | xxl = 48               |
| `gap-md`                   | `gap: spacing.md`      | md = 16                |
| `m-md` / `mx-md` / `my-md` | 同 padding 翻译        |                        |

## 5. 字体（Typography）

| Tailwind class               | RN StyleSheet                 | 主题 Key   |
| ---------------------------- | ----------------------------- | ---------- |
| `text-h1`                    | `...typography.h1`            | h1         |
| `text-h2`                    | `...typography.h2`            | h2         |
| `text-h3`                    | `...typography.h3`            | h3         |
| `text-body-md` / `text-base` | `...typography['body-md']`    | body-md    |
| `text-body-sm` / `text-sm`   | `...typography['body-sm']`    | body-sm    |
| `text-label-caps`            | `...typography['label-caps']` | label-caps |
| `font-bold`                  | `fontWeight: '700'`           | —          |
| `font-semibold`              | `fontWeight: '600'`           | —          |
| `font-medium`                | `fontWeight: '500'`           | —          |

## 6. 布局

| Tailwind class    | RN StyleSheet                     |
| ----------------- | --------------------------------- |
| `flex`            | `flex: 1`                         |
| `flex-1`          | `flex: 1`                         |
| `flex-row`        | `flexDirection: 'row'`            |
| `flex-col`        | `flexDirection: 'column'`         |
| `items-center`    | `alignItems: 'center'`            |
| `items-start`     | `alignItems: 'flex-start'`        |
| `items-end`       | `alignItems: 'flex-end'`          |
| `justify-center`  | `justifyContent: 'center'`        |
| `justify-between` | `justifyContent: 'space-between'` |
| `justify-start`   | `justifyContent: 'flex-start'`    |
| `justify-end`     | `justifyContent: 'flex-end'`      |
| `flex-wrap`       | `flexWrap: 'wrap'`                |
| `relative`        | `position: 'relative'`            |
| `absolute`        | `position: 'absolute'`            |
| `z-10`            | `zIndex: 10`                      |

## 7. 尺寸

| Tailwind class  | RN StyleSheet                                |
| --------------- | -------------------------------------------- |
| `w-full`        | `width: '100%'`                              |
| `w-1/2`         | `width: '50%'`                               |
| `w-screen`      | `width: Dimensions.get('window').width`      |
| `h-full`        | `height: '100%'`                             |
| `min-h-screen`  | `minHeight: Dimensions.get('window').height` |
| `aspect-square` | `aspectRatio: 1`                             |
| `aspect-video`  | `aspectRatio: 16 / 9`                        |

## 8. 边框

| Tailwind class                             | RN StyleSheet                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `border`                                   | `borderWidth: StyleSheet.hairlineWidth`                                    |
| `border-2`                                 | `borderWidth: 2`                                                           |
| `border-outline`                           | `borderColor: colors.outline`                                              |
| `border-outline-variant`                   | `borderColor: colors['outline-variant']`                                   |
| `rounded-xl border border-outline-variant` | `borderRadius: 12, borderWidth: 1, borderColor: colors['outline-variant']` |

## 9. 特殊效果（需要原生库）

| Tailwind class                 | RN 实现                                                                  | 依赖                   |
| ------------------------------ | ------------------------------------------------------------------------ | ---------------------- |
| `backdrop-blur-sm`             | `<BlurView intensity={20} tint="light">`                                 | `expo-blur`            |
| `backdrop-blur-md`             | `<BlurView intensity={40}>`                                              | `expo-blur`            |
| `bg-gradient-to-r from-x to-y` | `<LinearGradient colors={[from, to]} start={{x:0,y:0}} end={{x:1,y:0}}>` | `expo-linear-gradient` |
| `bg-gradient-to-b`             | `<LinearGradient ... end={{x:0,y:1}}>`                                   | `expo-linear-gradient` |

**渐变预设**（建议放在 `theme/gradients.ts`）：

```typescript
// theme/gradients.ts
export const gradients = {
  primaryHorizontal: ['#961813', '#b83228'],
  primaryVertical: ['#b83228', '#961813'],
  goldHorizontal: ['#D4A030', '#E8B84B'],
  surfaceSubtle: ['#FFFFFF', '#F5F5F5'],
};
```

## 10. 不支持的 Tailwind class（不要尝试翻译）

| Tailwind class         | 说明                 | 替代方案                                   |
| ---------------------- | -------------------- | ------------------------------------------ |
| `transition-all`       | RN 无 CSS transition | 用 `Animated` 或 `react-native-reanimated` |
| `hover:`               | RN 无 hover          | 用 `Pressable` 的 `pressed` 状态           |
| `group-hover:`         | 同上                 | 同上                                       |
| `@media`               | RN 用 Dimensions API | 用 `useWindowDimensions`                   |
| `::before` / `::after` | RN 无伪元素          | 用额外 `<View>` 包装                       |

## 翻译流程（推荐）

1. 阅读 HTML 中目标元素的 Tailwind class 串
2. 拆分各个 class（`bg-primary shadow-lg rounded-xl px-md py-sm`）
3. 逐个翻译为 RN StyleSheet 属性
4. 使用主题常量（colors / spacing / shadows）替代硬编码
5. 加入 StyleSheet.create 提升性能

## 翻译示例

```html
<!-- HTML -->
<div class="bg-surface rounded-2xl shadow-lg px-md py-sm flex-row items-center">
  <span class="text-primary font-bold text-h3">Hello</span>
</div>
```

```typescript
// RN
<View style={styles.card}>
  <Text style={styles.title}>Hello</Text>
</View>

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,            // rounded-2xl
    ...shadows.lg,                // shadow-lg
    paddingHorizontal: spacing.md, // px-md
    paddingVertical: spacing.sm,   // py-sm
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: colors.primary,
    fontWeight: '700',
    ...typography.h3,
  },
});
```
