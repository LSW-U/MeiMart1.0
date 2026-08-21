// NotificationListPage — 消息通知（P23 优化方案，见 第四梯队-辅助页面/P23-通知页-完整方案.md）
// 结构：PrimaryHeader（全部已读/设置入口）+ 四 Tab + 时间分组（今天/昨天/更早，SectionList）
//       + 超市场景通知卡（配送进度/骑手/倒计时/商品/满减）+ 分 tab 空态 + 未登录引导态
import { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { NotificationItem } from '@/components/business/NotificationItem';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/services/queries/useNotifications';
import { useAuthStore } from '@/store/authStore';
import type { Notification } from '@/types';

type TabKey = 'all' | 'order' | 'promotion' | 'system';
type DayGroup = 'today' | 'yesterday' | 'earlier';

/** 按 createdAt 归入时间分组（今天/昨天/更早）——本地时区口径（导出供单测） */
export function dayGroupOf(iso: string): DayGroup {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'earlier';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= startOfToday) return 'today';
  if (t >= startOfToday - 86400000) return 'yesterday';
  return 'earlier';
}

export default function NotificationsPage() {
  const handleBack = useSafeBack();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [tab, setTab] = useState<TabKey>('all');
  const { data: notifications, isLoading, isError, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  // Why: P23 D3 —— 单次 POST /read-all 替代逐条循环（原 N 条 N 请求）；hook 自带乐观三件套
  const markAllReadMutation = useMarkAllNotificationsRead();
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const filtered = useMemo(() => {
    if (!notifications) return [];
    if (tab === 'all') return notifications;
    return notifications.filter((n) => n.type === tab);
  }, [notifications, tab]);

  // Why: P23 D1 —— 时间分组（今天/昨天/更早），SectionList renderSectionHeader 渲染分组头
  const sections = useMemo(() => {
    const buckets: Record<DayGroup, Notification[]> = { today: [], yesterday: [], earlier: [] };
    filtered.forEach((n) => buckets[dayGroupOf(n.createdAt)].push(n));
    const titleKey: Record<DayGroup, string> = {
      today: 'service.notifications.timeToday',
      yesterday: 'service.notifications.timeYesterday',
      earlier: 'service.notifications.timeEarlier',
    };
    return (['today', 'yesterday', 'earlier'] as const)
      .filter((g) => buckets[g].length > 0)
      .map((g) => ({
        key: g,
        title: t(titleKey[g]),
        unread: buckets[g].filter((n) => !n.read).length,
        data: buckets[g],
      }));
  }, [filtered, t]);

  // Why: 审查发现 7 —— useMemo 记忆化（原先每渲染 4 趟 filter）
  const tabUnread: Record<TabKey, number> = useMemo(
    () => ({
      all: unreadCount,
      order: notifications?.filter((n) => !n.read && n.type === 'order').length ?? 0,
      promotion: notifications?.filter((n) => !n.read && n.type === 'promotion').length ?? 0,
      system: notifications?.filter((n) => !n.read && n.type === 'system').length ?? 0,
    }),
    [notifications, unreadCount],
  );

  const markAllRead = () => markAllReadMutation.mutate();

  // Why: P23 改动 3 —— 直达详情：order 带 data.orderId 跳 /order/[id]，无 id 降级列表；
  //      promotion 按 productId 分流；点击顺带标记单条已读
  const onPress = (item: Notification) => {
    if (!item.read) markRead.mutate(item.id);
    const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
    if (item.type === 'order') {
      const orderId = str(item.data?.orderId);
      if (orderId) router.push(`/order/${orderId}`);
      else router.push('/(main)/orders');
    } else if (item.type === 'promotion') {
      const productId = str(item.data?.productId);
      if (productId) router.push(`/product/${productId}`);
      else router.push('/coupons');
    }
  };

  // Why: P23 D4 —— 卡片内 CTA 分发（查看物流/付款→订单，去抢购/购买→商品，去凑单→购物车，去使用→券页）
  const onCta = (action: string, item: Notification) => {
    if (!item.read) markRead.mutate(item.id);
    const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
    const orderId = str(item.data?.orderId);
    const productId = str(item.data?.productId);
    switch (action) {
      case 'viewTracking':
      case 'payNow':
      case 'writeReview':
      case 'viewDetails':
      case 'viewOrder':
      case 'confirmReplacement':
        // Q2 拍板：确认替换跳订单详情由详情页处理；无 orderId 一律降级订单列表
        if (orderId) router.push(`/order/${orderId}`);
        else router.push('/(main)/orders');
        break;
      case 'shopNow':
      case 'buyNow':
        if (productId) router.push(`/product/${productId}`);
        else router.push('/(main)/categories');
        break;
      case 'addMore':
        router.push('/(main)/cart');
        break;
      case 'useCoupon':
        router.push('/coupons');
        break;
    }
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: t('service.notifications.tabAll') },
    { key: 'order', label: t('service.notifications.tabOrder') },
    {
      key: 'promotion',
      label: t('service.notifications.tabPromo'),
    },
    { key: 'system', label: t('service.notifications.tabSystem') },
  ];

  // Why: P23 D7 —— 分 tab 空态 + 未登录引导（未登录优先于 loading/error 判断）
  const renderEmpty = () => {
    if (!isAuthenticated) {
      return (
        <EmptyState
          title={t('service.notifications.loginTitle')}
          description={t('service.notifications.loginDesc')}
          icon="lock-outline"
          actionLabel={t('service.notifications.loginBtn')}
          onAction={() => router.replace('/(auth)/login')}
          testID="notif-empty-login"
        />
      );
    }
    switch (tab) {
      case 'order':
        return (
          <EmptyState
            title={t('service.notifications.emptyOrder')}
            icon="package-variant-closed"
            testID="notif-empty-order"
          />
        );
      case 'promotion':
        return (
          <EmptyState
            title={t('service.notifications.emptyPromo')}
            description={t('service.notifications.emptyPromoDesc')}
            icon="ticket-percent"
            testID="notif-empty-promo"
          />
        );
      case 'system':
        return (
          <EmptyState
            title={t('service.notifications.emptySystem')}
            icon="bell-outline"
            testID="notif-empty-system"
          />
        );
      default:
        return (
          <EmptyState
            title={t('service.notifications.empty')}
            description={t('service.notifications.emptyDesc')}
            icon="bell-outline"
            actionLabel={t('service.notifications.goBrowse')}
            onAction={() => router.push('/(main)/home')}
            testID="notif-empty-all"
          />
        );
    }
  };

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={t('service.notifications.title')}
        showBack
        onBackPress={handleBack}
        rightActions={
          unreadCount > 0 ? (
            <Pressable
              onPress={markAllRead}
              hitSlop={8}
              style={styles.readAllBtn}
              accessibilityRole="button"
              accessibilityLabel={t('service.notifications.readAll')}
              testID="notif-read-all"
            >
              {/* V22：done_all 图标 + 文字形态（原型明确操作入口）；原因：primary 底上固定白（on-primary token） */}
              <Icon symbol="done_all" size={20} color={colors['on-primary']} />
              <Text style={[styles.readAllText, { color: colors['on-primary'] }]}>
                {t('service.notifications.readAll')}
              </Text>
              <View style={[styles.readAllBadge, { backgroundColor: colors['on-primary'] }]}>
                <Text style={[styles.readAllBadgeText, { color: colors.primary }]}>
                  {unreadCount}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={8}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel={t('service.notifications.a11y.settings')}
              testID="notif-settings"
            >
              <Icon symbol="settings" size={22} color={colors['on-primary']} />
            </Pressable>
          )
        }
      />

      {/* Tab 栏 */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderBottomColor: colors['outline-variant'],
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabRow}>
            {TABS.map((tabItem) => {
              const isActive = tabItem.key === tab;
              const badge = tabUnread[tabItem.key];
              return (
                <Pressable
                  key={tabItem.key}
                  onPress={() => setTab(tabItem.key)}
                  style={styles.tabBtn}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={tabItem.label}
                  testID={`notif-tab-${tabItem.key}`}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? colors.primary : colors['on-surface-variant'],
                      },
                    ]}
                  >
                    {tabItem.label}
                  </Text>
                  {badge > 0 && (
                    <View
                      style={[
                        styles.tabBadge,
                        {
                          backgroundColor: isActive
                            ? colors.primary
                            : colors['surface-container'],
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabBadgeText,
                          {
                            color: isActive ? colors['on-primary'] : colors['on-surface-variant'],
                          },
                        ]}
                      >
                        {badge}
                      </Text>
                    </View>
                  )}
                  {isActive && (
                    <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {isLoading && isAuthenticated ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message={t('errors.notifications')} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        renderEmpty()
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.dayLabel}>
              <Icon
                symbol={
                  section.key === 'today'
                    ? 'today'
                    : section.key === 'yesterday'
                      ? 'history'
                      : 'schedule'
                }
                size={14}
                color={colors['on-surface-variant']}
              />
              <Text style={[styles.dayLabelText, { color: colors['on-surface-variant'] }]}>
                {section.title}
              </Text>
              {section.unread > 0 && (
                <Text style={[styles.dayCount, { color: colors['on-surface-variant'] }]}>
                  {t('service.notifications.unreadCount', { count: section.unread })}
                </Text>
              )}
            </View>
          )}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              testID={item.id}
              onPress={() => onPress(item)}
              onCta={(action, n) => onCta(action, n)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // V22：read-all 专用（图标+文字+badge 横排，非 40x40 图标钮）
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // V22：全部已读文字（与图标并排）
  readAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  readAllBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readAllBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: layout['container-margin'],
  },
  tabBtn: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  tabText: {
    ...typography['label-caps'],
    fontSize: 13,
  },
  tabBadge: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
    height: 2,
    borderRadius: 1,
  },
  // 时间分组头（原型 .day-label）
  dayLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  dayLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  dayCount: {
    marginLeft: 'auto',
    fontSize: 10,
    opacity: 0.7,
  },
  list: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
