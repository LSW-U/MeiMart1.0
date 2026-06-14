import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useProfile, useCoupons, useFavorites } from '@/services/queries/useUser';
import { useAuthStore } from '@/store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface MenuItem {
  label: string;
  icon: IconName;
  route?: string;
}

const MENU_GROUPS: { title: string; items: MenuItem[] }[] = [
  {
    title: '订单',
    items: [
      { label: '我的订单', icon: 'clipboard-list', route: '/(main)/orders' },
      { label: '收货地址', icon: 'map-marker', route: '/address/list' },
      { label: '优惠券', icon: 'ticket-percent', route: '/coupons' },
    ],
  },
  {
    title: '账户',
    items: [
      { label: '我的收藏', icon: 'heart', route: '/favorites' },
      { label: '消息通知', icon: 'bell', route: '/service/notifications' },
      { label: '客服中心', icon: 'headset', route: '/service' },
      { label: '关于我们', icon: 'information', route: '/about' },
    ],
  },
];

export default function ProfilePage() {
  const { colors } = useTheme();
  const { data: user, isLoading, isError, refetch } = useProfile();
  const { data: coupons } = useCoupons();
  const { data: favorites } = useFavorites();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  if (isLoading) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
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
        <ErrorState message="加载用户资料失败，请稍后重试" onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

  const logout = () => {
    clearAuth();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBarConfig />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          style={styles.profileRow}
          onPress={() => router.push('/profile/edit')}
          testID="profile-edit"
        >
          <Avatar uri={user.avatar} size="lg" fallback={user.name} />
          <View style={styles.profileText}>
            <Text style={[styles.name, { color: colors['on-surface'] }]}>{user.name}</Text>
            <Text style={[styles.phone, { color: colors['on-surface-variant'] }]}>
              {user.phone}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors['on-surface-variant']}
          />
        </Pressable>
        <TaisDivider />
        <View style={styles.statsRow}>
          <StatBox
            label="优惠券"
            value={coupons?.length ?? 0}
            color={colors.primary}
            subColor={colors['on-surface-variant']}
          />
          <StatBox
            label="收藏"
            value={favorites?.length ?? 0}
            color={colors.primary}
            subColor={colors['on-surface-variant']}
          />
          <StatBox
            label="积分"
            value={1280}
            color={colors.primary}
            subColor={colors['on-surface-variant']}
          />
        </View>
        {MENU_GROUPS.map((group) => (
          <View key={group.title} style={styles.menuGroup}>
            <Text style={[styles.groupTitle, { color: colors['on-surface-variant'] }]}>
              {group.title}
            </Text>
            <Card>
              {group.items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  testID={`menu-${item.label}`}
                  onPress={() => item.route && router.push(item.route)}
                  style={({ pressed }) => [
                    styles.menuRow,
                    idx > 0 && [
                      styles.menuBorder,
                      { borderBottomColor: colors['outline-variant'] },
                    ],
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name={item.icon} size={22} color={colors.primary} />
                  <Text style={[styles.menuLabel, { color: colors['on-surface'] }]}>
                    {item.label}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors['on-surface-variant']}
                  />
                </Pressable>
              ))}
            </Card>
          </View>
        ))}
        <Pressable
          testID="profile-logout"
          onPress={logout}
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors['surface-container-low'], opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.logoutText, { color: colors.error }]}>退出登录</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

function StatBox({
  label,
  value,
  color,
  subColor,
}: {
  label: string;
  value: number;
  color: string;
  subColor: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: subColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileText: { flex: 1 },
  name: { ...typography.h3, fontWeight: '700' },
  phone: { ...typography['body-sm'] },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center', gap: spacing.xs },
  statValue: { ...typography.h3, fontWeight: '700' },
  statLabel: { ...typography['label-caps'] },
  menuGroup: { gap: spacing.sm },
  groupTitle: { ...typography['label-caps'], paddingHorizontal: spacing.xs },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 48,
  },
  menuBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuLabel: { ...typography['body-md'], flex: 1 },
  logoutBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  logoutText: { ...typography['body-md'], fontWeight: '600' },
});
