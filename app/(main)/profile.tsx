// ProfilePage — 还原自 ProfilePage.html（306 行）
// HTML → RN 行数比：306 → ~370（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 121%）
// Fix-17: 补充 17 个图标 + tais-pattern Header + 4 宫格 + 服务列表
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography, shadowPresets, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { useProfile } from '@/services/queries/useUser';
import { useAuthStore } from '@/store/authStore';

// 默认头像 mock（HTML 第 150 行）
const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDTkRvY5IQj5crQ9J0WxeHh9B2lcLBNp6NrIk8FZoL0iBqr3sNYwIAnUgGA9a2lhDAGKNs0Y9WP7AFn3BXuHbbNV7ChtSLtV93tdcfLwqA5V1EEjiStXWYL7QF3KOaH2l2PSyl5nStpLu1j2Cein2M6_AQtoHf00DN0oQPQOhhyzWkt_l5Oaz_nW5Iw9W39bkQ1JLpw4LUIxhhdXtyzNK92y_yuLRTLO2aeZVgFGYM2UUOHzMkK6ya9RMSg3S47jxi0Fx098Wwl';

interface OrderEntry {
  id: string;
  label: string;
  icon: Parameters<typeof Icon>[0]['symbol'];
  badge?: number;
  route?: string;
}

// 4 宫格订单入口（HTML 第 170-197 行）
const ORDER_ENTRIES: OrderEntry[] = [
  {
    id: 'to-pay',
    label: 'To Pay',
    icon: 'account_balance_wallet',
    badge: 1,
    route: '/(main)/orders',
  },
  { id: 'to-ship', label: 'To Ship', icon: 'package_', route: '/(main)/orders' },
  {
    id: 'to-receive',
    label: 'To Receive',
    icon: 'local_shipping',
    badge: 2,
    route: '/(main)/orders',
  },
  { id: 'review', label: 'Review', icon: 'star_rate', route: '/order/review' },
];

interface FunctionItem {
  id: string;
  label: string;
  icon: Parameters<typeof Icon>[0]['symbol'];
  route?: string;
  rightText?: string;
  isError?: boolean;
}

// 功能菜单（HTML 第 200-244 行）
const FUNCTION_ITEMS: FunctionItem[] = [
  { id: 'coupons', label: 'My Coupons', icon: 'confirmation_number', route: '/coupons' },
  { id: 'address', label: 'Shipping Addresses', icon: 'location_on', route: '/address/list' },
  {
    id: 'language',
    label: 'Language Switch',
    icon: 'language',
    route: '/settings/language',
    rightText: 'English',
  },
  { id: 'help', label: 'Help Center', icon: 'help', route: '/service/help' },
  { id: 'settings', label: 'Settings', icon: 'settings', route: '/settings' },
  { id: 'logout', label: 'Log Out', icon: 'logout', isError: true },
];

// 未登录状态的功能菜单（无 Log Out）
const FUNCTION_ITEMS_EMPTY: FunctionItem[] = FUNCTION_ITEMS.filter((i) => i.id !== 'logout');

export default function ProfilePage() {
  const { colors } = useTheme();
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
        <Header />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaWrapper>
    );
  }
  if (isError || !user) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <Header />
        <ErrorState message="Failed to load profile. Please try again." onRetry={() => refetch()} />
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

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <Header />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card（向上覆盖到 tais-pattern 上） */}
        <View
          style={[
            styles.userCard,
            {
              backgroundColor: colors['surface-container-lowest'],
              ...shadowPresets.sm,
            },
          ]}
        >
          <Pressable
            onPress={() => router.push('/profile/edit')}
            style={styles.userRow}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <View style={styles.avatarWrap}>
              <Image source={{ uri: user.avatar ?? DEFAULT_AVATAR }} style={styles.avatar} />
            </View>
            <View style={styles.userText}>
              <Text style={[styles.userName, { color: colors['on-surface'] }]}>{user.name}</Text>
              <View style={styles.userMeta}>
                <Text style={[styles.userGold, { color: colors.primary }]}>Gold Member</Text>
                <Text style={[styles.userDivider, { color: colors['on-surface-variant'] }]}>|</Text>
                <Text style={[styles.userPoints, { color: colors['on-surface-variant'] }]}>
                  1,250 Points
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* My Orders 4 宫格 */}
        <View
          style={[
            styles.ordersCard,
            {
              backgroundColor: colors['surface-container-lowest'],
              ...shadowPresets.sm,
            },
          ]}
        >
          <View style={styles.ordersHeader}>
            <Text style={[styles.ordersTitle, { color: colors['on-surface'] }]}>My Orders</Text>
            <Pressable
              onPress={() => router.push('/(main)/orders')}
              style={styles.viewAllBtn}
              accessibilityRole="button"
              accessibilityLabel="View all orders"
            >
              <Text style={[styles.viewAllText, { color: colors['on-surface-variant'] }]}>
                VIEW ALL
              </Text>
              <Icon symbol="chevron_right" size={16} color={colors['on-surface-variant']} />
            </Pressable>
          </View>
          <View style={styles.ordersGrid}>
            {ORDER_ENTRIES.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => entry.route && router.push(entry.route)}
                style={styles.orderCell}
                accessibilityRole="button"
                accessibilityLabel={entry.label}
              >
                <View style={styles.orderIconWrap}>
                  <Icon symbol={entry.icon} size={28} color={colors['on-surface-variant']} />
                  {entry.badge ? (
                    <View style={[styles.orderBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.orderBadgeText}>{entry.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.orderLabel, { color: colors['on-surface-variant'] }]}>
                  {entry.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Function Menus */}
        <View
          style={[
            styles.functionsCard,
            {
              backgroundColor: colors['surface-container-lowest'],
              ...shadowPresets.sm,
            },
          ]}
        >
          {FUNCTION_ITEMS.map((item, idx) => (
            <Pressable
              key={item.id}
              testID={`menu-${item.id}`}
              onPress={() => onItemPress(item)}
              style={({ pressed }) => [
                styles.functionRow,
                idx > 0 && {
                  borderTopColor: 'rgba(225, 191, 186, 0.1)',
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <View style={styles.functionLeft}>
                <Icon
                  symbol={item.icon}
                  size={24}
                  color={item.isError ? colors.error : colors.primary}
                />
                <Text style={[styles.functionLabel, { color: colors['on-surface'] }]}>
                  {item.label}
                </Text>
              </View>
              <View style={styles.functionRight}>
                {item.rightText && (
                  <Text style={[styles.functionRightText, { color: 'rgba(89, 65, 61, 0.6)' }]}>
                    {item.rightText}
                  </Text>
                )}
                <Icon symbol="chevron_right" size={24} color={colors.outline} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Footer Logo / App Version */}
        <View style={styles.footerLogo}>
          <Text style={[styles.footerTitle, { color: colors.primary }]}>Mei Mart</Text>
          <Text style={[styles.footerVersion, { color: colors['on-surface-variant'] }]}>
            v2.4.0 (Timor-Leste)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

// Primary tais-pattern Header（HTML 第 142-144 行：h-14 顶栏 + h-48 tais-pattern 底色）
function Header() {
  const { colors } = useTheme();
  return (
    <View style={[styles.headerWrap, { backgroundColor: colors.primary, ...shadowPresets.md }]}>
      {/* 顶栏（h-14） */}
      <View style={styles.headerTop}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle} accessibilityRole="header">
          My Account
        </Text>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => router.push('/service/customer')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Customer Service"
          >
            <Icon symbol="headset" size={24} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/service/notifications')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Icon symbol="notifications" size={24} color="#ffffff" />
          </Pressable>
        </View>
      </View>
      {/* tais-pattern 底色块（h-48 = 192px，剩 ~150px） */}
      <View style={styles.headerPattern} pointerEvents="none">
        <TaisPattern width={390} height={150} opacity={0.1} />
      </View>
    </View>
  );
}

// ProfileEmpty — 未登录状态（Fix-18：还原 ProfileEmptyPage.html）
// 仍渲染 Header + Orders 4 宫格 + Function Menus（无 Log Out），点击触发登录
function ProfileEmpty() {
  const { colors } = useTheme();
  const onRequireLogin = () => {
    router.push('/(auth)/login');
  };
  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <Header />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card — 未登录（HTML 第 149-160 行） */}
        <View
          style={[
            styles.userCard,
            { backgroundColor: colors['surface-container-lowest'], ...shadowPresets.sm },
          ]}
        >
          <View style={styles.emptyAvatarWrap}>
            <View style={[styles.emptyAvatarCircle, { backgroundColor: 'rgba(150,24,19,0.1)' }]}>
              <Icon symbol="account_circle" size={40} color={colors.primary} />
            </View>
          </View>
          <Text style={[styles.emptyHint, { color: colors['on-surface-variant'] }]}>
            Login to enjoy member exclusive discount
          </Text>
          <Pressable
            onPress={onRequireLogin}
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Login or register"
          >
            <Text style={styles.loginBtnText}>LOGIN / REGISTER</Text>
          </Pressable>
        </View>

        {/* My Orders 4 宫格（无 badge） */}
        <View
          style={[
            styles.ordersCard,
            { backgroundColor: colors['surface-container-lowest'], ...shadowPresets.sm },
          ]}
        >
          <View style={styles.ordersHeader}>
            <Text style={[styles.ordersTitle, { color: colors['on-surface'] }]}>My Orders</Text>
            <Pressable
              onPress={onRequireLogin}
              style={styles.viewAllBtn}
              accessibilityRole="button"
              accessibilityLabel="View all orders (login required)"
            >
              <Text style={[styles.viewAllText, { color: colors['on-surface-variant'] }]}>
                VIEW ALL
              </Text>
              <Icon symbol="chevron_right" size={16} color={colors['on-surface-variant']} />
            </Pressable>
          </View>
          <View style={styles.ordersGrid}>
            {ORDER_ENTRIES.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={onRequireLogin}
                style={styles.orderCell}
                accessibilityRole="button"
                accessibilityLabel={`${entry.label} (login required)`}
              >
                <View style={styles.orderIconWrap}>
                  <Icon symbol={entry.icon} size={28} color={colors['on-surface-variant']} />
                </View>
                <Text style={[styles.orderLabel, { color: colors['on-surface-variant'] }]}>
                  {entry.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Function Menus（无 Log Out） */}
        <View
          style={[
            styles.functionsCard,
            { backgroundColor: colors['surface-container-lowest'], ...shadowPresets.sm },
          ]}
        >
          {FUNCTION_ITEMS_EMPTY.map((item, idx) => (
            <Pressable
              key={item.id}
              testID={`empty-menu-${item.id}`}
              onPress={onRequireLogin}
              style={({ pressed }) => [
                styles.functionRow,
                idx > 0 && {
                  borderTopColor: 'rgba(225, 191, 186, 0.1)',
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} (login required)`}
            >
              <View style={styles.functionLeft}>
                <Icon symbol={item.icon} size={24} color={colors.primary} />
                <Text style={[styles.functionLabel, { color: colors['on-surface'] }]}>
                  {item.label}
                </Text>
              </View>
              <View style={styles.functionRight}>
                {item.rightText && (
                  <Text style={[styles.functionRightText, { color: 'rgba(89, 65, 61, 0.6)' }]}>
                    {item.rightText}
                  </Text>
                )}
                <Icon symbol="chevron_right" size={24} color={colors.outline} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Footer Logo */}
        <View style={styles.footerLogo}>
          <Text style={[styles.footerTitle, { color: colors.primary }]}>Mei Mart</Text>
          <Text style={[styles.footerVersion, { color: colors['on-surface-variant'] }]}>
            v2.4.0 (Timor-Leste)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['container-margin'],
    height: 56,
    zIndex: 2,
  },
  headerSpacer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h2,
    color: '#ffffff',
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  headerPattern: {
    height: 150,
  },
  scrollContent: {
    paddingHorizontal: spacing['container-margin'],
    marginTop: -96,
    paddingBottom: spacing.xxl * 2,
    zIndex: 10,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(150, 24, 19, 0.2)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userText: {
    flex: 1,
    gap: 4,
  },
  userName: {
    ...typography.h2,
    fontWeight: '700',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userGold: {
    ...typography['body-sm'],
    fontWeight: '700',
  },
  userDivider: {
    ...typography['body-sm'],
    opacity: 0.3,
  },
  userPoints: {
    ...typography['body-sm'],
  },
  ordersCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  ordersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  ordersTitle: {
    ...typography.h3,
    fontWeight: '600',
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
    gap: spacing.lg,
  },
  orderCell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  orderIconWrap: {
    position: 'relative',
  },
  orderBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  orderLabel: {
    ...typography['label-caps'],
    fontSize: 10,
    textAlign: 'center',
  },
  functionsCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  functionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  functionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  functionLabel: {
    ...typography['body-md'],
  },
  functionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  functionRightText: {
    ...typography['body-sm'],
  },
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
