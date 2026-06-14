import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import { toIconName } from '@/types';
import type { CategoryItemProps } from './CategoryItem.types';

const SIZE_MAP = {
  sm: { box: 44, icon: 22, fontSize: 11 },
  md: { box: 56, icon: 28, fontSize: 12 },
  lg: { box: 72, icon: 36, fontSize: 14 },
} as const;

export function CategoryItem({ category, size = 'md', onPress, testID }: CategoryItemProps) {
  const { colors } = useTheme();
  const dims = SIZE_MAP[size];

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
            backgroundColor: colors['secondary-container'],
          },
        ]}
      >
        <MaterialCommunityIcons
          name={category.icon ? toIconName(category.icon) : 'tag'}
          size={dims.icon}
          color={colors['on-secondary-container']}
        />
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
  label: {
    textAlign: 'center',
  },
});

export { borderRadius };
