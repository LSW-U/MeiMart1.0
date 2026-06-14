import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import type { NotificationItemProps } from './NotificationItem.types';

const TYPE_ICON: Record<string, { name: string; colorKey: string }> = {
  order: { name: 'package-variant-closed', colorKey: 'primary' },
  promotion: { name: 'tag', colorKey: 'tertiary' },
  system: { name: 'bell', colorKey: 'secondary' },
};

export function NotificationItem({ notification, onPress, testID }: NotificationItemProps) {
  const { colors } = useTheme();
  const { name, colorKey } = TYPE_ICON[notification.type] ?? TYPE_ICON.system;
  const iconColor = colors[colorKey as keyof typeof colors] ?? colors.primary;

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors['surface-container-low'] },
        pressed && styles.pressed,
      ]}
      onPress={onPress ? () => onPress(notification) : undefined}
      accessibilityRole="button"
      accessibilityLabel={notification.title}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: colors['surface-variant'], borderRadius: borderRadius.md },
        ]}
      >
        <MaterialCommunityIcons name={name as any} size={24} color={iconColor as string} />
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text
            style={[
              textStyle('body-md'),
              { fontWeight: '700', color: colors['on-surface'] },
              !notification.read && styles.unreadTitle,
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          {!notification.read && <View style={[styles.dot, { backgroundColor: colors.error }]} />}
        </View>
        <Text
          style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}
          numberOfLines={2}
        >
          {notification.body}
        </Text>
        <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
          {new Date(notification.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  iconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  unreadTitle: { fontWeight: '900' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
