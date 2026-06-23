/**
 * Icon — 统一图标组件
 *
 * 解决 HTML 原型使用 Material Symbols（snake_case），RN 使用 MaterialCommunityIcons
 * （kebab-case）的命名差异。提供两种入口：
 *
 * 1. `symbol` 属性：HTML 原型的 Material Symbols 名称（自动查表翻译），用于翻译页面
 *    <Icon symbol="shopping_cart" size={24} color={colors.primary} />
 *
 * 2. `name` 属性：直接传 MaterialCommunityIcons 名称（已有 IconName 类型）
 *    <Icon name="cart" size={24} color={colors.primary} />
 *
 * 二者必传其一，`name` 优先级更高（同时传时以 name 为准）。
 *
 * 外层 View 用于承载 a11y/testID（@expo/vector-icons 的 Text 不会自动转发这些 props）。
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { View, type AccessibilityRole, type ViewStyle } from 'react-native';
import { symbolToMc, type IconName } from '@/theme/iconMapping';

export type IconProps = {
  /** Material Symbols 名称（HTML 原型风格），自动映射 */
  symbol?: string;
  /** MaterialCommunityIcons 名称（已映射） */
  name?: IconName;
  size?: number;
  color?: string;
  /** a11y 标签（推荐传，未传时使用 symbol/name 原值） */
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
  style?: ViewStyle;
};

function IconImpl({
  symbol,
  name,
  size = 24,
  color = '#000',
  accessibilityLabel,
  accessibilityRole = 'image',
  testID,
  style,
}: IconProps) {
  if (!symbol && !name) {
    throw new Error('Icon requires either `symbol` or `name` prop');
  }
  const resolvedName = (name ?? symbolToMc(symbol ?? '')) as IconName;
  const label = accessibilityLabel ?? symbol ?? name;
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={label}
      accessibilityRole={accessibilityRole}
      style={style}
    >
      <MaterialCommunityIcons name={resolvedName} size={size} color={color} />
    </View>
  );
}

export const Icon = memo(IconImpl);
