import { useState } from 'react';
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
  // Why: imageError 记录图片加载失败，失败后回退到 'tag' 图标，避免空白
  const [imageError, setImageError] = useState(false);
  const hasImage = Boolean(category.image) && !imageError;
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
          <Image
            source={{ uri: category.image }}
            style={styles.image}
            accessible={false}
            onError={() => setImageError(true)}
          />
        ) : (
          // Why: 无 image 或加载失败时显示 fallback 图标
          // category.icon 保留作矢量图标名备用（W8 再定），无值时走 'tag'
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
