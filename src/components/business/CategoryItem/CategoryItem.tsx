import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing } from '@/theme';
import { toIconName } from '@/types';
import type { CategoryItemProps } from './CategoryItem.types';

const SIZE_MAP = {
  sm: { box: 44, icon: 22, fontSize: 11 },
  md: { box: 48, icon: 24, fontSize: 10 },
  lg: { box: 72, icon: 36, fontSize: 14 },
} as const;

export function CategoryItem({ category, size = 'md', onPress, testID }: CategoryItemProps) {
  const { colors } = useTheme();
  const dims = SIZE_MAP[size];
  const bgColor = category.color ?? colors['secondary-container'];
  const borderColor = category.borderColor ?? 'transparent';
  const hasImage = Boolean(category.image);
  // 图片模式下，图标用 on-surface-variant；纯色背景用 on-secondary-container
  // 当 category.color 显式指定时（HTML 的 emerald-50 等），文字色应跟随分类主题色，
  // 简化处理：image 模式不需要图标，无 image 但有 color 时仍用 secondary-container 配色。
  const iconColor = colors['on-secondary-container'];

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress ? () => onPress(category) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Category ${category.name}`}
    >
      <View
        style={[
          styles.iconBox,
          {
            width: dims.box,
            height: dims.box,
            borderRadius: dims.box / 2,
            backgroundColor: bgColor,
            borderColor,
            borderWidth: 1,
            overflow: 'hidden',
          },
        ]}
      >
        {hasImage ? (
          <Image source={{ uri: category.image }} style={styles.image} accessible={false} />
        ) : (
          <MaterialCommunityIcons
            name={category.icon ? toIconName(category.icon) : 'tag'}
            size={dims.icon}
            color={iconColor}
          />
        )}
      </View>
      <Text
        style={[
          textStyle('body-sm'),
          { color: colors['on-surface'], fontSize: dims.fontSize },
          styles.label,
        ]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
    minWidth: 76,
  },
  pressed: { opacity: 0.7 },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  label: {
    textAlign: 'center',
  },
});
