// 顶部 4-Tab 导航（批5 拆分：从 app/product/[id].tsx 原样搬移，行为零变更）
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { CartIconButton } from '@/components/business/CartIconButton/CartIconButton';
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
      {/* P1-21：购物车入口收敛 CartIconButton（error 红角标统一形态；原 a11y cart.title 升级为含数量的 itemCount） */}
      <CartIconButton
        count={cartCount}
        iconColor={colors['primary-container']}
        onPress={() => router.push('/cart')}
        accessibilityLabel={translate('cart.a11y.itemCount', { count: cartCount })}
        style={styles.topBarBtn}
        hitSlop={8}
      />
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
