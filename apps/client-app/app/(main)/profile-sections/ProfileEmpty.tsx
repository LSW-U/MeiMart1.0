// ProfileEmpty - 未登录状态（Fix-18：还原 ProfileEmptyPage.html）
// P2 §8: 不展示 Discover（无个人化功能）；功能菜单保留收藏/优惠券（无统计条）；图标灰、无 badge
// 批5 拆分：从 app/(main)/profile.tsx 原样搬移，行为零变更（主文件 styles 中本组件用到的
// 样式 key 按使用方复制到本文件，视觉等价）
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, shadowPresets, borderRadius } from '@/theme';
import { APP_VERSION } from '@/utils/appInfo';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Icon } from '@/components/ui/Icon';
import { ON_PRIMARY, ORDER_ENTRIES, FUNCTION_ITEMS_EMPTY } from './shared';
import { ProfileHeader } from './ProfileHeader';

export function ProfileEmpty() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const onRequireLogin = () => {
    router.replace('/(auth)/login');
  };
  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <ProfileHeader />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card - 未登录（HTML 第 149-160 行） */}
        <View
          style={[
            styles.userCard,
            { backgroundColor: colors['surface-container-lowest'], ...shadowPresets.sm },
          ]}
        >
          <View style={styles.emptyAvatarWrap}>
            <View
              style={[styles.emptyAvatarCircle, { backgroundColor: colors['surface-container'] }]}
            >
              <Icon symbol="account_circle" size={40} color={colors.primary} />
            </View>
          </View>
          <Text style={[styles.emptyHint, { color: colors['on-surface-variant'] }]}>
            {t('profile.loginHint')}
          </Text>
          <Pressable
            onPress={onRequireLogin}
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('profile.loginOrRegister')}
          >
            <Text style={styles.loginBtnText}>{t('profile.loginRegister')}</Text>
          </Pressable>
        </View>

        {/* My Orders 4 宫格（无 badge，图标灰，点击触发登录） */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'], ...shadowPresets.sm },
          ]}
        >
          <View style={styles.ordersHead}>
            <Text style={[styles.ordersTitle, { color: colors['on-surface'] }]}>
              {t('profile.orders')}
            </Text>
            <Pressable
              onPress={onRequireLogin}
              style={styles.viewAllBtn}
              accessibilityRole="button"
              accessibilityLabel={t('profile.viewAllOrdersLogin')}
            >
              <Text style={[styles.viewAllText, { color: colors['on-surface-variant'] }]}>
                {t('common.viewAll')}
              </Text>
              <Icon symbol="chevron_right" size={14} color={colors['on-surface-variant']} />
            </Pressable>
          </View>
          <View style={styles.ordersGrid}>
            {ORDER_ENTRIES.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={onRequireLogin}
                style={({ pressed }) => [styles.orderCell, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={t('profile.loginRequiredSuffix', {
                  label: t(entry.labelKey),
                })}
              >
                <View style={styles.orderTileNew}>
                  <Icon symbol={entry.icon} size={26} color={colors['on-surface-variant']} />
                </View>
                <Text style={[styles.orderLabel, { color: colors['on-surface-variant'] }]}>
                  {t(entry.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Function Menus（保留 收藏/优惠券 + 地址/帮助/设置，无 Log Out） */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'], ...shadowPresets.sm },
          ]}
        >
          {FUNCTION_ITEMS_EMPTY.map((item, idx) => (
            <Pressable
              key={item.id}
              testID={`empty-menu-${item.id}`}
              onPress={onRequireLogin}
              style={({ pressed }) => [
                styles.funcRow,
                idx > 0 && {
                  borderTopColor: colors['outline-variant'],
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('profile.loginRequiredSuffix', { label: t(item.labelKey) })}
            >
              <View style={styles.funcLeft}>
                <View
                  style={[styles.funcIconWrap, { backgroundColor: colors['surface-container'] }]}
                >
                  <Icon symbol={item.icon} size={20} color={colors.primary} />
                </View>
                <Text style={[styles.funcLabel, { color: colors['on-surface'] }]}>
                  {t(item.labelKey)}
                </Text>
              </View>
              <Icon symbol="chevron_right" size={20} color={colors.outline} />
            </Pressable>
          ))}
        </View>

        {/* Footer Logo */}
        <View style={styles.footerLogo}>
          <Text style={[styles.footerTitle, { color: colors.primary }]}>{t('home.appName')}</Text>
          <Text style={[styles.footerVersion, { color: colors['on-surface-variant'] }]}>
            {`v${APP_VERSION}`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: layout['container-margin'],
    paddingTop: spacing.md,
    paddingBottom: 24,
    gap: spacing.md,
  },
  // === card 通用 ===
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  // === orders ===
  ordersHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  ordersTitle: {
    ...typography.h3,
    fontWeight: '700',
    fontSize: 15,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  ordersGrid: {
    flexDirection: 'row',
    gap: spacing.lg, // §3.2 保持大间距 gap=24
  },
  orderCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  orderTileNew: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  orderLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // === funcs ===
  funcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  funcLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  funcIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  funcLabel: {
    ...typography['body-md'],
    fontWeight: '500',
  },
  // === footer ===
  footerLogo: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: 0,
    opacity: 0.3,
    gap: 2,
  },
  footerTitle: {
    ...typography.h1,
    fontWeight: '700',
    letterSpacing: -1,
  },
  footerVersion: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  // === ProfileEmpty ===
  userCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyAvatarWrap: {
    width: 96,
    height: 96,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    ...typography['body-sm'],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  loginBtn: {
    width: '100%',
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowPresets.md,
  },
  loginBtnText: {
    color: ON_PRIMARY,
    ...typography['label-caps'],
    letterSpacing: 1.5,
  },
});
