// NotificationListPage — 消息通知（P23 优化方案，见 第四梯队-辅助页面/P23-通知页-完整方案.md）
// 结构：PrimaryHeader（全部已读/设置入口）+ 四 Tab + 时间分组（今天/昨天/更早，SectionList）
//       + 超市场景通知卡（配送进度/骑手/倒计时/商品/满减）+ 分 tab 空态 + 未登录引导态
import { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { safeRoutePush } from '@meimart/nav-core';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { NotificationItem, TickerProvider } from '@/components/business/NotificationItem';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/store/toastStore';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotifications,
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
  // 批2（#3 通知管理，D4）：管理模式——复用收藏页 selectMode 先例（app/favorites.tsx）：
  // 整卡单 Pressable + 圆圈纯状态，勾选后底部管理栏批量删除 + 二次确认。
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: notifications, isLoading, isError, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  // Why: P23 D3 —— 单次 POST /read-all 替代逐条循环（原 N 条 N 请求）；hook 自带乐观三件套
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteNotifications = useDeleteNotifications();
  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  const executeDelete = useCallback(() => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    deleteNotifications.mutate(ids, {
      onSuccess: () => {
        toast.success(t('service.notifications.deleted', { count: ids.length }));
        exitSelectMode();
      },
      onError: () => {
        toast.error(t('service.notifications.deleteFailed'));
      },
    });
  }, [selected, deleteNotifications, t, exitSelectMode]);

  // Why: 收藏页同款（app/favorites.tsx:122-144）——Web 端 Alert 不显示直接执行；Native 用 Alert 二次确认
  const removeSelected = useCallback(() => {
    if (selected.size === 0 || deleteNotifications.isPending) return;
    if (Platform.OS === 'web') {
      executeDelete();
      return;
    }
    Alert.alert(
      t('service.notifications.deleteTitle'),
      t('service.notifications.deleteConfirm', { count: selected.size }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: executeDelete },
      ],
    );
  }, [selected, deleteNotifications.isPending, executeDelete, t]);

  const handleCardPress = useCallback(
    (item: Notification, navigate: (n: Notification) => void) => {
      if (selectMode) {
        toggleSelect(item.id);
        return;
      }
      navigate(item);
    },
    [selectMode, toggleSelect],
  );

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
  // 批3 A6：orderId/productId 是服务端可控数据，动态段跳转统一走 safeRoutePush
  // 白名单（非法 id 降级不导航，与下方 else 分支同口径）
  const onPress = (item: Notification) => {
    if (!item.read) markRead.mutate(item.id);
    const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
    if (item.type === 'order') {
      const orderId = str(item.data?.orderId);
      if (orderId) safeRoutePush((href) => router.push(href as never), '/order', orderId);
      else router.push('/(main)/orders');
    } else if (item.type === 'promotion') {
      const productId = str(item.data?.productId);
      if (productId) safeRoutePush((href) => router.push(href as never), '/product', productId);
      else router.push('/coupons');
    }
  };

  // Why: P23 D4 —— 卡片内 CTA 分发（查看物流/付款→订单，去抢购/购买→商品，去凑单→购物车，去使用→券页）
  // 批3 A6：同 onPress——动态段走 safeRoutePush，静态降级直接 push
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
        if (orderId) safeRoutePush((href) => router.push(href as never), '/order', orderId);
        else router.push('/(main)/orders');
        break;
      case 'shopNow':
      case 'buyNow':
        if (productId) safeRoutePush((href) => router.push(href as never), '/product', productId);
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

  // Why: 批2 管理入口语义重组——右上角统一为「管理」入口（二态 readAll/settings 按钮
  // 与管理模式冲突，互斥显示无法共存）；原已读/设置能力移入管理模式底栏（勿丢失功能）。
  const headerRight = selectMode ? (
    <Pressable
      onPress={exitSelectMode}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('common.cancel')}
      testID="notif-exit-select"
    >
      <Text style={[styles.headerActionText, { color: colors['on-primary'] }]}>
        {t('common.cancel')}
      </Text>
    </Pressable>
  ) : (
    <Pressable
      onPress={() => setSelectMode(true)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('service.notifications.a11y.manage')}
      testID="notif-manage"
    >
      <Text style={[styles.headerActionText, { color: colors['on-primary'] }]}>
        {t('service.notifications.manage')}
      </Text>
    </Pressable>
  );

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
        title={
          selectMode
            ? t('service.notifications.selectedTitle', { count: selected.size })
            : t('service.notifications.title')
        }
        showBack
        onBackPress={selectMode ? exitSelectMode : handleBack}
        rightActions={headerRight}
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
                          backgroundColor: isActive ? colors.primary : colors['surface-container'],
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
        // C-P2-11: 单一共享 ticker——列表内所有倒计时项共用此 Provider 的 1s 心跳
        //（消灭原每项各自 setInterval 的 N 个定时器）
        <TickerProvider>
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
                selectMode={selectMode}
                isSelected={selected.has(item.id)}
                onPress={() =>
                  handleCardPress(item, (n) => {
                    if (!n.read) markRead.mutate(n.id);
                    onPress(n);
                  })
                }
                onCta={selectMode ? undefined : (action, n) => onCta(action, n)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        </TickerProvider>
      )}

      {/* 管理模式底栏（复用收藏页 manageBar 先例）：全部已读 + 通知设置（原 header 能力保留可达）+ 删除 */}
      {selectMode && (
        <View
          style={[
            styles.manageBar,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderTopColor: colors['outline-variant'],
            },
          ]}
        >
          <Pressable
            onPress={markAllRead}
            style={styles.manageBarBtn}
            accessibilityRole="button"
            accessibilityLabel={t('service.notifications.readAll')}
            testID="notif-read-all"
          >
            <Icon symbol="done_all" size={20} color={colors.primary} />
            <Text style={[styles.manageBarText, { color: colors['on-surface'] }]}>
              {t('service.notifications.readAll')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.manageBarBtn}
            accessibilityRole="button"
            accessibilityLabel={t('service.notifications.a11y.settings')}
            testID="notif-settings"
          >
            <Icon symbol="settings" size={20} color={colors.primary} />
            <Text style={[styles.manageBarText, { color: colors['on-surface'] }]}>
              {t('service.notifications.a11y.settings')}
            </Text>
          </Pressable>
          <Pressable
            onPress={removeSelected}
            disabled={selected.size === 0 || deleteNotifications.isPending}
            style={({ pressed }) => [
              styles.manageBarDelete,
              {
                backgroundColor:
                  selected.size === 0 || deleteNotifications.isPending
                    ? colors['outline-variant']
                    : colors.error,
                opacity: selected.size === 0 || deleteNotifications.isPending ? 0.5 : 1,
              },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
            accessibilityState={
              selected.size === 0 || deleteNotifications.isPending ? { disabled: true } : undefined
            }
            testID="notif-batch-delete"
          >
            <Icon symbol="delete" size={18} color={colors['on-primary']} />
            <Text style={[styles.manageBarDeleteText, { color: colors['on-primary'] }]}>
              {t('common.delete')} ({selected.size})
            </Text>
          </Pressable>
        </View>
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
  // 批2：header「管理/取消」文字钮（原型 readAllBtn 同位置文字形态）
  headerActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 批2：管理模式底栏（收藏页 manageBar 同构：左操作 · 右删除）
  manageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  manageBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manageBarText: {
    fontSize: 13,
    fontWeight: '500',
  },
  manageBarDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  manageBarDeleteText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // V22：read-all 专用（图标+文字+badge 横排，非 40x40 图标钮）
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    // F2：readAllBadge 是 absolute 子元素，父级显式 relative 做参考系（同 orders tabBtn 惯例）
    position: 'relative',
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
