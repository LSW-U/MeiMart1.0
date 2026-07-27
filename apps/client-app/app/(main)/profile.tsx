// ProfilePage - 还原自 ProfilePage.html + P2 优化原型（usercard-new + Discover + Account&Service）
// HTML -> RN 行数比：306 -> ~520（含 P2 重构样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 170%）
// P2 Commit 1: UI 布局重构（数据接入见 Commit 2，dark mode 收尾见 Commit 3）
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, shadowPresets, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { useProfile } from '@/services/queries/useUser';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';
import { PageSkeleton } from '@/components/feedback/PageSkeleton/PageSkeleton';

// 默认头像 mock（HTML 第 150 行）
const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDTkRvY5IQj5crQ9J0WxeHh9B2lcLBNp6NrIk8FZoL0iBqr3sNYwIAnUgGA9a2lhDAGKNs0Y9WP7AFn3BXuHbbNV7ChtSLtV93tdcfLwqA5V1EEjiStXWYL7QF3KOaH2l2PSyl5nStpLu1j2Cein2M6_AQtoHf00DN0oQPQOhhyzWkt_l5Oaz_nW5Iw9W39bkQ1JLpw4LUIxhhdXtyzNK92y_yuLRTLO2aeZVgFGYM2UUOHzMkK6ya9RMSg3S47jxi0Fx098Wwl';

interface OrderEntry {
  id: string;
  labelKey:
    | 'order.statusToPay'
    | 'order.statusToShip'
    | 'order.statusToReceive'
    | 'order.actions.review';
  icon: Parameters<typeof Icon>[0]['symbol'];
  badge?: number; // P2 Commit 2 接真实订单计数，无值则隐藏
  route?: string;
}

// 4 宫格订单入口（HTML 第 170-197 行）- badge 当前为占位，Commit 2 接 useOrderCounts
const ORDER_ENTRIES: OrderEntry[] = [
  {
    id: 'to-pay',
    labelKey: 'order.statusToPay',
    icon: 'account_balance_wallet',
    badge: 1,
    route: '/(main)/orders',
  },
  { id: 'to-ship', labelKey: 'order.statusToShip', icon: 'package_', route: '/(main)/orders' },
  {
    id: 'to-receive',
    labelKey: 'order.statusToReceive',
    icon: 'local_shipping',
    badge: 2,
    route: '/(main)/orders',
  },
  { id: 'review', labelKey: 'order.actions.review', icon: 'star_rate', route: '/order/review' },
];

interface FunctionItem {
  id: string;
  labelKey: string;
  icon: Parameters<typeof Icon>[0]['symbol'];
  route?: string;
  isError?: boolean;
}

// P2 §3.4: 登录态功能菜单只留 地址/帮助/设置/退出（收藏/优惠券已合并到 usercard 统计条）
const FUNCTION_ITEMS: FunctionItem[] = [
  { id: 'address', labelKey: 'address.list', icon: 'location_on', route: '/address/list' },
  { id: 'help', labelKey: 'profile.help', icon: 'help', route: '/service/help' },
  { id: 'settings', labelKey: 'profile.settings', icon: 'settings', route: '/settings' },
  { id: 'logout', labelKey: 'profile.logout', icon: 'logout', isError: true },
];

// P2 §8: 未登录态无 usercard 统计条 -> 收藏/优惠券入口必须留在功能菜单里
const FUNCTION_ITEMS_EMPTY: FunctionItem[] = [
  { id: 'favorites', labelKey: 'profile.favorites', icon: 'favorite', route: '/favorites' },
  { id: 'coupons', labelKey: 'profile.coupons', icon: 'confirmation_number', route: '/coupons' },
  { id: 'address', labelKey: 'address.list', icon: 'location_on', route: '/address/list' },
  { id: 'help', labelKey: 'profile.help', icon: 'help', route: '/service/help' },
  { id: 'settings', labelKey: 'profile.settings', icon: 'settings', route: '/settings' },
];

// P2 §6: Discover 快捷功能宫格 - C1 仅 UI + toast 占位，功能后续按 F2->F1->F4->F3 实现
interface DiscoverEntry {
  id: string;
  labelKey: string;
  icon: Parameters<typeof Icon>[0]['symbol'];
  isNew?: boolean;
}
const DISCOVER_ENTRIES: DiscoverEntry[] = [
  { id: 'invite', labelKey: 'profile.invite', icon: 'group_add', isNew: true },
  { id: 'history', labelKey: 'profile.history', icon: 'history' },
  { id: 'becomeSeller', labelKey: 'profile.becomeSeller', icon: 'storefront', isNew: true },
  { id: 'scan', labelKey: 'profile.scan', icon: 'qr_code_scanner' },
];

export default function ProfilePage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: user, isLoading, isError, refetch } = useProfile();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // 未登录分支（Fix-18：ProfileEmptyPage HTML 还原）
  if (!isAuthenticated) {
    return <ProfileEmpty />;
  }

  if (isLoading) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <ProfileHeader />
        <PageSkeleton variant="list" rows={4} />
      </SafeAreaWrapper>
    );
  }
  if (isError || !user) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <ProfileHeader />
        <ErrorState message={t('errors.profile')} onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

  const onItemPress = (item: FunctionItem) => {
    if (item.id === 'logout') {
      clearAuth();
      router.replace('/(auth)/login');
      return;
    }
    if (item.route) router.push(item.route);
  };

  // P2 §6: Discover 功能 C1 占位 -> toast「功能开发中」（功能按 F2->F1->F4->F3 后续实现）
  const onDiscoverPress = (item: DiscoverEntry) => {
    toast.info(
      t('profile.featureComingSoon', { defaultValue: 'Feature coming soon' }),
    );
    void item;
  };

  return (
    <PageErrorBoundary pageName="profile">
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
        {/* usercard-new: 红底渐变 banner + 积分/优惠券/收藏三格统计条（§3.1 锁定） */}
        <View style={[styles.userCardNew, shadowPresets.md]}>
          {/* member-banner */}
          <LinearGradient
            colors={[colors.primary, '#b53026']} // 原因：banner 渐变终止色（HTML 原型 #b53026，primary 暗化版），dark 不变
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.memberBanner}
          >
            <Pressable
              onPress={() => router.push('/profile/edit')}
              style={styles.memberRow}
              accessibilityRole="button"
              accessibilityLabel={t('profile.edit')}
            >
              <View style={styles.avatarNewWrap}>
                <SafeImage source={{ uri: user.avatar ?? DEFAULT_AVATAR }} style={styles.avatarNew} />
              </View>
              <View style={styles.memberText}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName} numberOfLines={1}>{user.name}</Text>
                  {/* GOLD 胶囊：半透明白底（§3.1），Commit 2 按 memberLevel 显示/隐藏 */}
                  <View style={styles.memberBadge}>
                    <Text style={styles.memberBadgeText}>GOLD</Text>
                  </View>
                </View>
                <View style={styles.memberTier}>
                  <Icon symbol="workspace_premium" size={13} color={colors['tertiary-fixed-dim']} />
                  <Text style={styles.memberTierText}>{t('profile.goldMember')}</Text>
                </View>
              </View>
              <View style={styles.editBtnNew}>
                <Icon symbol="edit" size={18} color="#ffffff" />
              </View>
            </Pressable>
          </LinearGradient>
          {/* points-strip 三格统计条 - Commit 2 接 user.points / useCoupons / useFavorites */}
          <View
            style={[
              styles.pointsStrip,
              { backgroundColor: colors['surface-container-low'], borderTopColor: colors['outline-variant'] },
            ]}
          >
            <Pressable
              style={styles.pointsCell}
              accessibilityRole="button"
              accessibilityLabel={t('profile.pointsUnit')}
            >
              <Text style={[styles.pointsNum, { color: colors.primary }]}>1,250</Text>
              <Text style={[styles.pointsLabel, { color: colors.secondary }]}>
                {t('profile.pointsUnit')}
              </Text>
              <Icon
                symbol="chevron_right"
                size={12}
                color={colors.outline}
              />
            </Pressable>
            <Pressable
              style={[styles.pointsCell, { borderLeftColor: colors['outline-variant'], borderLeftWidth: StyleSheet.hairlineWidth }]}
              accessibilityRole="button"
              accessibilityLabel={t('profile.coupons')}
            >
              <Text style={[styles.pointsNumMuted, { color: colors['on-surface-variant'] }]}>3</Text>
              <Text style={[styles.pointsLabel, { color: colors.secondary }]}>
                {t('profile.coupons')}
              </Text>
              <Icon symbol="chevron_right" size={12} color={colors.outline} />
            </Pressable>
            <Pressable
              style={[styles.pointsCell, { borderLeftColor: colors['outline-variant'], borderLeftWidth: StyleSheet.hairlineWidth }]}
              accessibilityRole="button"
              accessibilityLabel={t('profile.favorites')}
            >
              <Text style={[styles.pointsNumMuted, { color: colors['on-surface-variant'] }]}>12</Text>
              <Text style={[styles.pointsLabel, { color: colors.secondary }]}>
                {t('profile.favorites')}
              </Text>
              <Icon symbol="chevron_right" size={12} color={colors.outline} />
            </Pressable>
          </View>
        </View>

        {/* 1. My Orders 订单宫格（透明底 primary 图标 + badge 白描边圈，§3.2） */}
        <View style={[styles.card, { backgroundColor: colors['surface-container-lowest'] }, shadowPresets.sm]}>
          <View style={styles.ordersHead}>
            <Text style={[styles.ordersTitle, { color: colors['on-surface'] }]}>
              {t('profile.orders')}
            </Text>
            <Pressable
              onPress={() => router.push('/(main)/orders')}
              style={styles.viewAllBtn}
              accessibilityRole="button"
              accessibilityLabel={t('profile.viewAllOrders')}
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
                onPress={() => entry.route && router.push(entry.route)}
                style={({ pressed }) => [styles.orderCell, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={t(entry.labelKey)}
              >
                <View style={styles.orderTileNew}>
                  <Icon symbol={entry.icon} size={26} color={colors.primary} />
                  {entry.badge ? (
                    <View
                      style={[
                        styles.orderBadge,
                        {
                          backgroundColor: colors.primary,
                          borderColor: colors['surface-container-lowest'],
                        },
                      ]}
                    >
                      <Text style={styles.orderBadgeText}>{entry.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.orderLabel, { color: colors['on-surface-variant'] }]}>
                  {t(entry.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 2. Discover 快捷功能宫格（透明底 primary 图标，Invite/Seller 标 NEW，§3.3） */}
        <Text style={[styles.sectionLabel, { color: colors.outline }]}>
          {t('profile.sectionDiscover')}
        </Text>
        <View
          style={[styles.quickGrid, { backgroundColor: colors['surface-container-lowest'] }, shadowPresets.sm]}
        >
          {DISCOVER_ENTRIES.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => onDiscoverPress(entry)}
              style={({ pressed }) => [styles.quickCell, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={t(entry.labelKey)}
            >
              <View style={styles.quickIcon}>
                <Icon symbol={entry.icon} size={22} color={colors.primary} />
                {entry.isNew && (
                  <View
                    style={[
                      styles.badgeDot,
                      {
                        backgroundColor: colors.semantic.positive,
                        borderColor: colors['surface-container-lowest'],
                      },
                    ]}
                  />
                )}
              </View>
              <Text style={[styles.quickLabel, { color: colors['on-surface-variant'] }]}>
                {t(entry.labelKey)}
              </Text>
              {entry.isNew && (
                <Text style={[styles.newTag, { color: colors.semantic.positive }]}>NEW</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* 3. Account & Service 单卡（圆角色块图标，§3.4） */}
        <Text style={[styles.sectionLabel, { color: colors.outline }]}>
          {t('profile.sectionAccount')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors['surface-container-lowest'] }, shadowPresets.sm]}>
          {FUNCTION_ITEMS.map((item, idx) => (
            <Pressable
              key={item.id}
              testID={`menu-${item.id}`}
              onPress={() => onItemPress(item)}
              style={({ pressed }) => [
                styles.funcRow,
                idx > 0 && {
                  borderTopColor: colors['outline-variant'],
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t(item.labelKey)}
            >
              <View style={styles.funcLeft}>
                <View
                  style={[styles.funcIconWrap, { backgroundColor: colors['surface-container'] }]}
                >
                  <Icon symbol={item.icon} size={20} color={colors.primary} />
                </View>
                <Text
                  style={[
                    styles.funcLabel,
                    { color: item.isError ? colors.primary : colors['on-surface'] },
                  ]}
                >
                  {t(item.labelKey)}
                </Text>
              </View>
              <Icon symbol="chevron_right" size={20} color={colors.outline} />
            </Pressable>
          ))}
        </View>

        {/* Footer Logo / App Version */}
        <View style={styles.footerLogo}>
          <Text style={[styles.footerTitle, { color: colors.primary }]}>{t('home.appName')}</Text>
          <Text style={[styles.footerVersion, { color: colors['on-surface-variant'] }]}>
            {t('profile.version')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
    </PageErrorBoundary>
  );
}

// Primary tais-pattern Header（HTML 第 142-144 行：h-14 顶栏 + h-48 tais-pattern 底色）
// 已迁移到 PrimaryHeader 组件（CP-FIX P1-3），PrimaryHeader 内置 TaisPattern absolute 叠层（§3.5）
function ProfileHeader() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ backgroundColor: colors.primary, ...shadowPresets.md }}>
      <PrimaryHeader
        title={t('profile.title')}
        rightActions={
          <View style={profileHeaderStyles.actions}>
            <Pressable
              onPress={() => router.push('/service')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('profile.customerService')}
            >
              <Icon symbol="headset" size={24} color="#ffffff" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/service/notifications')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('profile.notifications')}
            >
              <Icon symbol="notifications" size={24} color="#ffffff" />
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const profileHeaderStyles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});

// ProfileEmpty - 未登录状态（Fix-18：还原 ProfileEmptyPage.html）
// P2 §8: 不展示 Discover（无个人化功能）；功能菜单保留收藏/优惠券（无统计条）；图标灰、无 badge
function ProfileEmpty() {
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
            <View style={[styles.emptyAvatarCircle, { backgroundColor: colors['surface-container'] }]}>
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
            {t('profile.version')}
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
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  // === usercard-new ===
  userCardNew: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  memberBanner: {
    padding: spacing.lg,
    paddingBottom: spacing.lg + 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  avatarNewWrap: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)', // 原因：头像白边叠在红底 banner 上，dark 不变
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarNew: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  memberText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberName: {
    ...typography.h2,
    fontWeight: '700',
    fontSize: 18,
    color: '#ffffff',
    flexShrink: 1,
  },
  memberBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', // 原因：GOLD 胶囊半透明白底（§3.1），叠红底 dark 不变
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  memberBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  memberTier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberTierText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)', // 原因：会员等级副文字叠红底，dark 不变
  },
  editBtnNew: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', // 原因：编辑按钮半透明白底叠红底，dark 不变
    flexShrink: 0,
  },
  // === points-strip ===
  pointsStrip: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pointsCell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 3,
  },
  pointsNum: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Noto Serif',
  },
  pointsNumMuted: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Noto Serif',
  },
  pointsLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
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
  orderBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 999,
    borderWidth: 2, // §3.2 badge 白描边圈
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  orderLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  // === section label ===
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
    marginTop: 2,
  },
  // === Discover quick-grid ===
  quickGrid: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  quickCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  quickIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 2,
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  newTag: {
    fontSize: 7,
    fontWeight: '700',
    marginTop: -2,
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
    paddingVertical: spacing.xl,
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
    color: '#ffffff',
    ...typography['label-caps'],
    letterSpacing: 1.5,
  },
});
