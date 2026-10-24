// 顶部 4-Tab 导航（批5 拆分：从 app/product/[id].tsx 原样搬移，行为零变更）
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { TABS, type TabKey } from '../shared';

export function TopBar({
  activeTab,
  onTabPress,
  onBack,
  onShare,
  cartCount = 0,
}: {
  activeTab: TabKey;
  onTabPress: (t: TabKey) => void;
  onBack: () => void;
  onShare?: () => void;
  cartCount?: number;
}) {
  const { colors } = useTheme();
  const { t: translate } = useTranslation();

  return (
    <View
      style={[
        styles.topBar,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderBottomColor: colors['outline-variant'],
        },
      ]}
    >
      <Pressable
        onPress={onBack}
        hitSlop={8}
        style={styles.topBarBtn}
        accessibilityRole="button"
        accessibilityLabel={translate('common.goBack')}
      >
        <Icon symbol="arrow_back" size={24} color={colors['on-surface']} />
      </Pressable>
      <ScrollView
        style={styles.tabsWrap}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map((t) => {
          const isActive = t === activeTab;
          return (
            <Pressable
              key={t}
              onPress={() => onTabPress(t)}
              style={[styles.tabBtn, isActive && { borderBottomColor: colors.primary }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? colors.primary : colors['on-surface-variant'],
                  },
                ]}
              >
                {translate(`product.tab.${t.toLowerCase()}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        onPress={onShare ?? (() => {})}
        hitSlop={8}
        style={styles.topBarBtn}
        accessibilityRole="button"
        accessibilityLabel={translate('common.share')}
      >
        <Icon symbol="share" size={24} color={colors['on-surface']} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/cart')}
        hitSlop={8}
        style={styles.topBarBtn}
        accessibilityRole="button"
        accessibilityLabel={translate('cart.title')}
      >
        <Icon symbol="shopping_cart" size={24} color={colors['primary-container']} />
        {/* P0-6：自绘白底+primary 字角标 dark 1.70:1 不可读 → Badge error 底（对齐 home 消息角标已验证方案） */}
        {cartCount > 0 && (
          <Badge
            count={cartCount}
            variant="number"
            color={colors.semantic.error}
            accessibilityLabel={translate('cart.a11y.itemCount', { count: cartCount })}
            style={styles.cartBadge}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // P0-6：角标本体走 Badge（error 底 + on-primary 字），这里只留定位（原白底红字形态废弃）
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    zIndex: 10,
  },
  tabsWrap: {
    flex: 1,
  },
  tabsContent: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  tabBtn: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    ...typography['label-caps'],
    fontWeight: '700',
  },
});
