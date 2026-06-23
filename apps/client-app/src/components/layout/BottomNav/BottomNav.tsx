import { StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing } from '@/theme';
import { Badge } from '@/components/ui/Badge';
import { useCart } from '@/services/queries/useCart';
import { toIconName } from '@/types';
import type { BottomNavProps } from './BottomNav.types';
import { BOTTOM_TAB_ITEMS } from './BottomNav.types';

export function BottomNav({ activeTab, onTabPress, testID }: BottomNavProps) {
  const { colors } = useTheme();
  const { data: cart } = useCart();
  const cartCount = cart?.totalItems ?? 0;

  return (
    <View
      testID={testID}
      style={[
        styles.nav,
        {
          backgroundColor: colors['surface-container-lowest'],
          shadowColor: colors['on-surface'],
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 8,
        },
      ]}
      accessibilityRole="tablist"
    >
      {BOTTOM_TAB_ITEMS.map((item) => {
        const isActive = activeTab === item.key;
        const color = isActive ? colors.primary : colors['on-surface-variant'];
        return (
          <Pressable
            key={item.key}
            style={styles.item}
            onPress={() => onTabPress(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
          >
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name={toIconName(item.icon)} size={24} color={color} />
              {item.key === 'cart' && cartCount > 0 && (
                <Badge count={cartCount} variant="number" style={styles.badge} />
              )}
            </View>
            <Text
              style={[
                textStyle('label-caps'),
                { color, fontSize: 10, fontWeight: isActive ? '700' : '400' },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
  },
});
