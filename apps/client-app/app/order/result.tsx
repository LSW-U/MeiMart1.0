// PaymentResultPage — 订单结果页（P28 优化：5 状态机 S1-S5）
// 状态判定：checkout 跳转传 status/orderId/orderNo，result 页据 status 渲染对应态。
//   S1 成功（COD 下单 / 预付支付成功）/ S2 待支付（PENDING_PAYMENT）/ S3 支付失败 /
//   S4 下单失败（createOrder catch，无 orderId）/ S5 超时取消（S2 倒计时到 0）
//
// ⚠️ S3 PAY_FAIL 预留态：当前架构下 result 页由 checkout 跳入（createOrder 成功后），
//   支付动作发生在订单详情页 /order/[id] 的 pay action（跳 /order/checkout 兜底），
//   不在 result 页入口，故 S3 暂无触发路径——pickState 不映射 PAY_FAIL。
//   待后期独立支付页 L1（app/order/pay.tsx）落地后，由支付页回传 status=PAY_FAIL 触发。
//   见方案 §6.3 L1 / §11.3。代码与 i18n（payFail* key）保留不删。
//
// 倒计时：payDeadline（后端契约 createdAt+15min，未就绪前端兜底），useCountdown 每秒 mm:ss，到 0 切 S5
// 取消订单：Alert 确认 + useCancelOrder + toast + 1.5s 返回首页（D13/D14）
import { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Text, Pressable, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { useOrder, useCancelOrder } from '@/services/queries/useOrders';
import { toast } from '@/store/toastStore';
import { formatPrice } from '@/utils/format';
import type { OrderStatus } from '@/types';

// S2 待支付倒计时基准：payDeadline 缺失时用 createdAt + 15min 兜底（D11，后端未就绪前前端计算）
const PAY_COUNTDOWN_MS = 15 * 60 * 1000;

type ResultState = 'SUCCESS' | 'PENDING' | 'PAY_FAIL' | 'ORDER_FAIL' | 'TIMEOUT';

interface StateTheme {
  iconBg: string;
  iconColor: string;
  symbol: string;
  titleKey: string;
  descKey: string;
}

function pickState(status: string | undefined): ResultState {
  if (!status) return 'ORDER_FAIL';
  switch (status as OrderStatus) {
    case 'PENDING_PAYMENT':
      return 'PENDING';
    case 'CANCELLED':
      return 'TIMEOUT';
    default:
      return 'SUCCESS';
  }
}

// S2/S5 倒计时：每秒递减 mm:ss，到 0 触发 onExpired 切 S5（参考 NotificationItem.tsx setInterval 模式）
function useCountdown(deadlineMs: number | null, onExpired: () => void) {
  const [remaining, setRemaining] = useState(() =>
    deadlineMs == null ? 0 : Math.max(0, deadlineMs - Date.now()),
  );
  useEffect(() => {
    if (deadlineMs == null) {
      // deadlineMs 为 null 时计时器不启动，仅在外部依赖变化时重置（避免 effect 内同步 setState）
      return;
    }
    const tick = () => {
      const left = Math.max(0, deadlineMs - Date.now());
      setRemaining(left);
      if (left <= 0) {
        onExpired();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // onExpired 仅在倒计时归零触发一次，依赖 deadlineMs 即可（onExpired 引用变化不重置计时器）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs]);
  return remaining;
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function OrderResultScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  useSafeBack();
  const params = useLocalSearchParams<{ orderId?: string; orderNo?: string; status?: string }>();

  const orderId = params.orderId;
  const initialOrderNo = params.orderNo ?? '';
  const baseState = pickState(params.status);
  // S2 倒计时归零后切 S5（TIMEOUT），用户态可变
  const [state, setState] = useState<ResultState>(baseState);

  // 有 orderId 才拉详情（S4 下单失败无 orderId，不拉）
  const { data: order } = useOrder(orderId ?? '');
  const cancelOrder = useCancelOrder();

  // payDeadline 兜底：后端未就绪时用 createdAt + 15min（D11）
  const payDeadlineMs = (() => {
    const deadline = order?.payDeadline ?? null;
    if (deadline) return new Date(deadline).getTime();
    if (order?.createdAt) return new Date(order.createdAt).getTime() + PAY_COUNTDOWN_MS;
    return null;
  })();
  // 仅 PENDING 态需要倒计时；其他态 payDeadline 不参与（避免历史订单 createdAt 已过期触发误切 S5）
  const countdownDeadline = state === 'PENDING' ? payDeadlineMs : null;
  const remaining = useCountdown(countdownDeadline, () => setState('TIMEOUT'));

  const orderNo = order?.orderNo ?? initialOrderNo;
  const items = order?.items ?? [];
  const totalGoods = items.reduce((sum, it) => sum + it.product.price * it.quantity, 0);
  const deliveryFee = order?.deliveryFee ?? 0;
  const discount = order?.discountAmount ?? 0;
  const amountDue = order?.totalPrice ?? totalGoods + deliveryFee - discount;

  const stateTheme: Record<ResultState, StateTheme> = {
    SUCCESS: {
      iconBg: colors.semantic['success-container'],
      iconColor: colors.semantic.success,
      symbol: 'check_circle',
      titleKey: 'result.successTitle2',
      descKey: 'result.successDesc2',
    },
    PENDING: {
      iconBg: colors.semantic['warning-container'],
      iconColor: colors.semantic.warning,
      symbol: 'hourglass_top',
      titleKey: 'result.pendingTitle',
      descKey: 'result.pendingDesc',
    },
    PAY_FAIL: {
      iconBg: colors.semantic['error-container'],
      iconColor: colors.semantic.error,
      symbol: 'error_outline',
      titleKey: 'result.payFailTitle',
      descKey: 'result.payFailDesc',
    },
    ORDER_FAIL: {
      iconBg: colors.semantic['error-container'],
      iconColor: colors.semantic.error,
      symbol: 'cloud_off',
      titleKey: 'result.orderFailTitle',
      descKey: 'result.orderFailDesc',
    },
    TIMEOUT: {
      iconBg: colors.semantic['error-container'],
      iconColor: colors.semantic.error,
      symbol: 'timer_off',
      titleKey: 'result.cancelledTitle',
      descKey: 'result.cancelledDesc',
    },
  };
  const st = stateTheme[state];

  const goOrderDetail = () => {
    if (orderId) router.push({ pathname: '/order/[id]', params: { id: orderId } });
  };
  // #006 语义收口（批次2 拍板）：payNow/retryPay 与「查看订单」同为跳订单详情页——
  // 详情页对 PENDING_PAYMENT 已渲染去支付按钮（order/[id].tsx order-pay）承接支付。
  // 删掉与 goOrderDetail 实现完全重复的 goCheckout，按钮直连，行为不变。
  const goHome = () => router.replace('/(main)/home');
  const goSupport = () => router.push('/service/customer-service');

  const handleCancel = () => {
    if (!orderId) return;
    const doCancel = () => {
      cancelOrder.mutate(orderId, {
        onSuccess: () => {
          toast.success(t('result.cancelledTitle'));
          setTimeout(() => router.replace('/(main)/home'), 1500);
        },
        onError: () => toast.error(t('result.cancelledTitle')),
      });
    };
    if (Platform.OS === 'web') {
      doCancel();
    } else {
      Alert.alert(t('result.cancelledTitle'), t('result.cancelledDesc'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  return (
    <SafeAreaWrapper edges={['top', 'bottom']} style={styles.screen}>
      <StatusBarConfig />
      <PrimaryHeader title={t('result.titleUnified')} showBack onBackPress={goHome} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero 状态图标 + 标题 + 描述 */}
        <View style={[styles.heroIcon, { backgroundColor: st.iconBg }]} accessibilityRole="image">
          <Icon symbol={st.symbol} size={48} color={st.iconColor} />
        </View>
        <Text
          style={[typography.h2, { color: colors['on-surface'] }, styles.heroTitle]}
          accessibilityRole="header"
        >
          {t(st.titleKey)}
        </Text>
        <Text style={[typography['body-md'], { color: colors['on-surface-variant'] }, styles.heroDesc]}>
          {t(st.descKey)}
        </Text>

        {/* 成功态：Tais 纹样分隔（文化元素） */}
        {state === 'SUCCESS' && <TaisDivider />}

        {/* 待支付 / 超时态：倒计时条 */}
        {(state === 'PENDING' || state === 'TIMEOUT') && (
          <View
            style={[
              styles.countdownCard,
              {
                backgroundColor: colors.semantic['warning-container'],
                borderColor: colors.semantic.warning,
              },
            ]}
            accessibilityRole="timer"
            accessibilityLabel={`${t('result.countdownLabel')} ${formatCountdown(remaining)}`}
          >
            <Icon
              symbol={state === 'PENDING' ? 'hourglass_top' : 'timer_off'}
              size={20}
              color={colors.semantic.warning}
            />
            <View style={styles.countdownText}>
              <Text style={[typography['body-sm'], { color: colors['on-surface-variant'] }]}>
                {t('result.countdownLabel')}
              </Text>
              <Text style={[typography['body-md'], { color: colors['on-surface'] }]}>
                {state === 'PENDING'
                  ? formatCountdown(remaining)
                  : t('result.countdownExpired')}
              </Text>
            </View>
          </View>
        )}

        {/* 失败态：失败原因卡 */}
        {(state === 'PAY_FAIL' || state === 'ORDER_FAIL') && (
          <View
            style={[
              styles.failCard,
              {
                backgroundColor: colors.semantic['error-container'],
                borderColor: colors.semantic.error,
              },
            ]}
            accessibilityRole="summary"
          >
            <Text style={[typography['body-sm'], { color: colors.semantic.error }]}>
              {t('result.failReason')}
            </Text>
            <Text style={[typography['body-md'], { color: colors['on-surface'] }]}>
              {t(state === 'PAY_FAIL' ? 'result.payFailReason' : 'result.orderFailDesc')}
            </Text>
          </View>
        )}

        {/* 订单摘要卡（有订单数据才渲染） */}
        {order && (
          <View
            style={[styles.summaryCard, { backgroundColor: colors['surface-container-lowest'] }, shadowPresets.md]}
            accessibilityRole="summary"
          >
            <View style={styles.summaryHeader}>
              <Text style={[typography['body-sm'], { color: colors['on-surface-variant'] }]}>
                {t('result.orderInfo')}
              </Text>
              <Text style={[typography['label-caps'], { color: colors['on-surface'] }]}>
                {orderNo}
              </Text>
            </View>

            {/* 商品预览（前 2 个 + 查看全部） */}
            {items.length > 0 && (
              <View style={styles.itemsPreview}>
                <Text style={[typography['body-sm'], { color: colors['on-surface-variant'] }]}>
                  {t('result.itemsCount', { count: items.reduce((sum, it) => sum + it.quantity, 0) })}
                </Text>
                {items.slice(0, 2).map((it) => (
                  <View key={it.id} style={styles.itemRow} accessibilityRole="button">
                    <Icon symbol="shopping_cart" size={20} color={colors['on-surface-variant']} />
                    <Text
                      style={[typography['body-md'], { color: colors['on-surface'] }, styles.itemName]}
                      numberOfLines={1}
                    >
                      {it.product.name.en}
                    </Text>
                    <Text style={[typography['body-sm'], { color: colors['on-surface-variant'] }]}>
                      ×{it.quantity}
                    </Text>
                  </View>
                ))}
                {items.length > 2 && (
                  <Pressable onPress={goOrderDetail} accessibilityRole="button">
                    <Text style={[typography['body-sm'], { color: colors.primary }]}>
                      {t('result.viewAllItems')}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* 金额明细 */}
            <View style={styles.amountBlock}>
              <View style={styles.amountRow}>
                <Text style={[typography['body-sm'], { color: colors['on-surface-variant'] }]}>
                  {t('result.totalGoods')}
                </Text>
                <Text style={[typography['body-md'], { color: colors['on-surface'] }]}>
                  {formatPrice(totalGoods)}
                </Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={[typography['body-sm'], { color: colors['on-surface-variant'] }]}>
                  {t('result.deliveryFee')}
                </Text>
                <Text style={[typography['body-md'], { color: colors['on-surface'] }]}>
                  {formatPrice(deliveryFee)}
                </Text>
              </View>
              {discount > 0 && (
                <View style={styles.amountRow}>
                  <Text style={[typography['body-sm'], { color: colors['on-surface-variant'] }]}>
                    {t('result.discount')}
                  </Text>
                  <Text style={[typography['body-md'], { color: colors.semantic.success }]}>
                    -{formatPrice(discount)}
                  </Text>
                </View>
              )}
              <View style={[styles.amountRow, styles.amountDueRow]}>
                <Text style={[typography['label-caps'], { color: colors['on-surface'] }]}>
                  {t('result.amountDue')}
                </Text>
                <Text style={[typography.h3, { color: colors.primary }]}>
                  {formatPrice(amountDue)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ETA 条（成功态 + 有订单） */}
        {state === 'SUCCESS' && order && (
          <View
            style={[styles.etaBar, { backgroundColor: colors.semantic['info-container'] }]}
            accessibilityRole="text"
          >
            <Icon symbol="local_shipping" size={20} color={colors.semantic.info} />
            <Text style={[typography['body-sm'], { color: colors['on-surface'] }]}>
              {t('result.eta')}：{t('result.etaFallback')}
            </Text>
          </View>
        )}

        {/* 客服入口 */}
        <Pressable
          onPress={goSupport}
          style={[styles.supportEntry, { borderColor: colors['outline-variant'] }]}
          accessibilityRole="button"
          accessibilityLabel={t('result.contactSupport')}
        >
          <Icon symbol="headset_mic" size={20} color={colors.primary} />
          <Text style={[typography['body-md'], { color: colors.primary }, styles.supportText]}>
            {t(state === 'PAY_FAIL' ? 'result.paySupport' : state === 'ORDER_FAIL' ? 'result.orderSupport' : 'result.contactSupport')}
          </Text>
          <Icon symbol="chevron_right" size={20} color={colors['on-surface-variant']} />
        </Pressable>
      </ScrollView>

      {/* 底部操作栏（按状态渲染不同按钮） */}
      <View style={[styles.actionBar, { borderTopColor: colors['outline-variant'] }]}>
        {state === 'SUCCESS' && (
          <>
            <Button
              variant="outline"
              label={t('result.viewOrder')}
              onPress={goOrderDetail}
              accessibilityHint={t('result.viewOrder')}
              style={styles.actionBtn}
            />
            <Button
              label={t('result.continueShopping')}
              onPress={goHome}
              accessibilityHint={t('result.continueShopping')}
              style={styles.actionBtn}
            />
          </>
        )}
        {state === 'PENDING' && (
          <>
            <Button
              variant="outline"
              label={t('common.cancel')}
              onPress={handleCancel}
              loading={cancelOrder.isPending}
              accessibilityHint={t('common.cancel')}
              style={styles.actionBtn}
            />
            <Button
              label={t('result.payNow')}
              onPress={goOrderDetail}
              accessibilityHint={t('result.payNow')}
              style={styles.actionBtn}
            />
          </>
        )}
        {state === 'PAY_FAIL' && (
          <>
            <Button
              variant="outline"
              label={t('common.cancel')}
              onPress={handleCancel}
              loading={cancelOrder.isPending}
              accessibilityHint={t('common.cancel')}
              style={styles.actionBtn}
            />
            <Button
              label={t('result.retryPay')}
              onPress={goOrderDetail}
              accessibilityHint={t('result.retryPay')}
              style={styles.actionBtn}
            />
          </>
        )}
        {state === 'ORDER_FAIL' && (
          <>
            <Button
              variant="outline"
              label={t('result.backHome')}
              onPress={goHome}
              accessibilityHint={t('result.backHome')}
              style={styles.actionBtn}
            />
            <Button
              label={t('result.reorder')}
              onPress={goHome}
              accessibilityHint={t('result.reorder')}
              style={styles.actionBtn}
            />
          </>
        )}
        {state === 'TIMEOUT' && (
          <>
            <Button
              variant="outline"
              label={t('result.backHome')}
              onPress={goHome}
              accessibilityHint={t('result.backHome')}
              style={styles.actionBtn}
            />
            <Button
              label={t('result.reorder')}
              onPress={goHome}
              accessibilityHint={t('result.reorder')}
              style={styles.actionBtn}
            />
          </>
        )}
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, paddingBottom: 120 },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: { textAlign: 'center', marginBottom: spacing.xs },
  heroDesc: { textAlign: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  countdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  countdownText: { flex: 1 },
  failCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  summaryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    marginBottom: spacing.sm,
  },
  itemsPreview: { gap: spacing.sm, marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemName: { flex: 1 },
  amountBlock: { gap: spacing.xs, paddingTop: spacing.sm },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountDueRow: {
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  etaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  supportEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  supportText: { flex: 1 },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    backgroundColor: '#ffffff',
  },
  actionBtn: { flex: 1 },
});
