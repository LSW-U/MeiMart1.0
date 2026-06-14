import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import type { PromoShortcutProps } from './PromoShortcut.types';

export function PromoShortcut({ items, onPress, testID }: PromoShortcutProps) {
  const { colors } = useTheme();

  return (
    <View testID={testID} style={[styles.container, { backgroundColor: colors.surface }]}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [
            styles.item,
            { backgroundColor: colors['primary-container'], borderRadius: borderRadius.lg },
            pressed && styles.pressed,
          ]}
          onPress={onPress ? () => onPress(item) : undefined}
          accessibilityRole="button"
          accessibilityLabel={item.title}
        >
          <MaterialCommunityIcons
            name={item.icon as any}
            size={28}
            color={colors['on-primary-container']}
          />
          <Text
            style={[
              textStyle('body-sm'),
              { color: colors['on-primary-container'], fontWeight: '700' },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  item: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    minWidth: 72,
  },
  pressed: { opacity: 0.85 },
});
