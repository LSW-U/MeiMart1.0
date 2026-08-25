# React Native 组件模式

## 何时触发

当你在**创建或修改 `.tsx` 组件文件**时。

## 项目组件结构规范

每个 UI 组件必须包含 4 个文件：

```
src/components/ui/ComponentName/
├── ComponentName.tsx         # 组件实现
├── ComponentName.types.ts    # 类型定义
├── ComponentName.test.tsx    # 测试（至少 1 个渲染测试）
└── index.ts                  # 导出 barrel
```

### 组件模板

```typescript
// ComponentName.tsx
import { View, Text, type ViewStyle } from 'react-native';
import { useStyles } from '@/theme/useStyles'; // 如果项目用 useStyles
import type { ComponentNameProps } from './ComponentName.types';

export function ComponentName({ title, onPress }: ComponentNameProps) {
  return (
    <View
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text>{title}</Text>
    </View>
  );
}
```

```typescript
// ComponentName.types.ts
export interface ComponentNameProps {
  title: string;
  onPress?: () => void;
}
```

## 样式系统：className（NativeWind）优先

本项目配置了 NativeWind。**组件样式优先使用 `className`**，不要直接用 `StyleSheet`。

```typescript
// ✅ 正确：使用 className
<View className="flex-1 bg-surface px-4 py-2 rounded-lg">
  <Text className="text-base text-primary font-semibold">{title}</Text>
</View>

// ❌ 避免：直接 StyleSheet（除非动态样式无法用 className 表达）
<View style={styles.container}>

// ✅ 例外：需要动态计算的样式可以用 StyleSheet
const dynamicStyle = useMemo(
  () => StyleSheet.create({ width: calculatedWidth }),
  [calculatedWidth],
);
```

### 为什么？

MeiMart 曾出现 0/37 页面全部使用 StyleSheet 而非 NativeWind className 的问题。导致：
1. 设计系统（主题色、间距 token）形同虚设
2. 后续改主题需要逐文件修改而非改 Tailwind config
3. 与设计原型的 class 命名不一致，难以对照

## 主题色引用

```typescript
// ✅ 正确：使用 theme colors
import { colors } from '@/theme/colors';
<View style={{ backgroundColor: colors.surface }}>

// ❌ 禁止：硬编码颜色
<View style={{ backgroundColor: '#FFFFFF' }}>
<View style={{ backgroundColor: 'white' }}>
```

### 可用的 theme colors（参考 src/theme/colors.ts）

- `primary` / `primaryLight` / `primaryDark` — 主品牌色
- `surface` / `surfaceVariant` — 背景层
- `textPrimary` / `textSecondary` / `textTertiary` — 文字层级
- `success` / `warning` / `error` / `info` — 状态色
- `outline` / `outlineVariant` — 边框

## 无障碍属性（a11y）— 必须

每个可交互组件必须标注：

```typescript
// 按钮类
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="加入购物车"
  accessibilityHint="将此商品加入购物车"
>
// 图片
<Image
  accessibilityRole="image"
  accessibilityLabel="超市 Logo"
/>
// 列表
<FlatList
  accessibilityRole="list"
/>
```

## 性能优化要点

### 1. 列表用 FlashList 不用 FlatList

```typescript
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={products}
  renderItem={renderItem}
  estimatedItemSize={120} // 必须设置，影响性能
  keyExtractor={(item) => item.id}
/>
```

### 2. 回调函数 memo 化

```typescript
// ✅ 传递给子组件的回调要 useCallback
const handlePress = useCallback((id: string) => {
  navigate('ProductDetail', { id });
}, [navigate]);

// ❌ 每次渲染创建新函数，导致子组件重渲染
const handlePress = (id: string) => { navigate('ProductDetail', { id }); };
```

### 3. 昂贵计算用 useMemo

```typescript
const sortedProducts = useMemo(
  () => products.sort((a, b) => a.price - b.price),
  [products],
);
```

## 测试最小要求

每个组件至少 1 个渲染测试：

```typescript
// ComponentName.test.tsx
import { render } from '@testing-library/react-native';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders title correctly', () => {
    const { getByText } = render(<ComponentName title="测试标题" />);
    expect(getByText('测试标题')).toBeTruthy();
  });
});
```
