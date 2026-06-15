import { Pressable, StyleSheet, Text, View } from 'react-native';
import { textStyle, spacing } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { DecorativeCorner } from '@/components/cultural/DecorativeCorner';
import type { PromoShortcutItem, PromoShortcutProps } from './PromoShortcut.types';

export function PromoShortcut({ items, onPress, testID }: PromoShortcutProps) {
  return (
    <View testID={testID} style={styles.grid}>
      {items.map((item) => (
        <PromoCard key={item.id} item={item} onPress={onPress} />
      ))}
    </View>
  );
}

function PromoCard({
  item,
  onPress,
}: {
  item: PromoShortcutItem;
  onPress?: (item: PromoShortcutItem) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: item.bgColor,
          borderColor: item.borderColor,
        },
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress ? () => onPress(item) : undefined}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      {item.withCorner && (
        <View style={styles.corner} pointerEvents="none">
          <DecorativeCorner size={48} variant="primary" />
        </View>
      )}

      <View style={styles.textCol}>
        <Text style={[styles.label, { color: item.labelColor }]} numberOfLines={1}>
          {item.label}
        </Text>
        <Text style={[styles.title, { color: item.titleColor }]} numberOfLines={1}>
          {item.title}
        </Text>
      </View>

      <View style={styles.iconWrap}>
        <Icon symbol={item.icon} size={30} color={item.iconColor} accessibilityLabel={item.title} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    right: -4,
    top: -4,
    opacity: 0.1,
  },
  textCol: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
    marginRight: spacing.sm,
  },
  label: {
    ...textStyle('label-caps'),
    fontSize: 10,
    letterSpacing: 0.5,
  },
  title: {
    ...textStyle('h3'),
    fontWeight: '700',
    fontSize: 18,
  },
  iconWrap: {
    opacity: 0.5,
  },
});
