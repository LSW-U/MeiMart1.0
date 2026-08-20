// PaymentResultPage — 订单结果页（成功态，严格按 HTML 原型还原）
// HTML 结构：Header(返回+标题+客服) → Hero(check_circle + Thank you + 支付金额成功提示)
//          → 订单详情卡(ORDER ID / Estimated arrival / 收货地址 三段) → italic 邮件提示
//          → 纵向两按钮(TRACK ORDER STATUS / CONTINUE SHOPPING)
// 数据来源：checkout 跳转传 orderId/orderNo，result 页 useOrder 拉详情取地址 + useOrderEta 取送达时间
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useOrder } from '@/services/queries/useOrders';
import { useOrderEta } from '@/services/queries/useOrderEta';
import { formatPrice, formatEta } from '@/utils/format';
import type { OrderStatus } from '@/types';

export default function OrderResultScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  useSafeBack();
  const params = useLocalSearchParams<{ orderId?: string; orderNo?: string }>();

  const orderId = params.orderId ?? '';
  const initialOrderNo = params.orderNo ?? '';

  const { data: order } = useOrder(orderId);
  // Why: useOrderEta 仅 PICKED/OUT_FOR_DELIVERY 才查 task（CONFIRMED 及之前无 task），结果页成功态多为
  //      CONFIRMED，ETA 常为 null，此时用 etaFallback 文案兜底（对齐 HTML "Today 4:00 PM - 6:00 PM" 占位）
  const orderStatus: OrderStatus = order?.status ?? 'CONFIRMED';
  const { data: eta } = useOrderEta(orderId, orderStatus);

  const orderNo = order?.orderNo ?? initialOrderNo;
  const address = order?.address;
  const amountPaid = order?.totalPrice ?? 0;
  const etaText = eta ? formatEta(eta, i18n.language) : t('result.etaFallback');

  const goTrackOrder = () => {
    if (orderId) router.push({ pathname: '/order/[id]', params: { id: orderId } });
  };
  const goHome = () => router.replace('/(main)/home');
  const goSupport = () => router.push('/service/customer-service');

  return (
    <SafeAreaWrapper edges={['top', 'bottom']} style={styles.screen}>
      <StatusBarConfig />
      <PrimaryHeader
        title={t('result.title')}
        showBack
        onBackPress={goHome}
        rightActions={
          <Button variant="text" label={t('result.contactSupport')} onPress={goSupport} />
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          {/* Success Icon — check_circle（HTML: tertiary-fixed 底圈 + tertiary 图标） */}
          <View style={[styles.heroIcon, { backgroundColor: colors.semantic['warning-container'] }]} accessibilityRole="image">
            <Icon symbol="check_circle" size={56} color={colors.semantic.warning} />
          </View>
          <Text
            style={[typography.h2, { color: colors['on-surface'] }, styles.heroTitle]}
            accessibilityRole="header"
          >
            {t('result.successTitle2')}
          </Text>
          {/* 支付金额成功提示：Your payment of $X was successful */}
          <Text style={[typography['body-md'], { color: colors['on-surface-variant'] }, styles.heroDesc]}>
            {t('result.paymentSuccess', {
              amount: formatPrice(amountPaid),
              defaultValue: 'Your payment of {{amount}} was successful.',
            })}
          </Text>
        </View>

        {/* Order Details Card — 三段：ORDER ID / Estimated arrival / 收货地址（单卡内布局） */}
        <View
          style={[
            styles.detailCard,
            { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
            shadowPresets.sm,
          ]}
          accessibilityRole="summary"
        >
          {/* 段 1：ORDER ID */}
          <View style={[styles.detailRow, styles.detailRowBordered, { borderBottomColor: colors['outline-variant'] }]}>
            <Text style={[typography['label-caps'], { color: colors['on-surface-variant'] }]}>
              {t('result.orderIdLabel')}
            </Text>
            <Text style={[typography['body-md'], { color: colors['on-surface'] }, styles.detailValueBold]}>
              {orderNo}
            </Text>
          </View>

          {/* 段 2：Estimated arrival（local_shipping 图标） */}
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors['primary-container'] }]}>
              <Icon symbol="local_shipping" size={20} color={colors.primary} />
            </View>
            <View style={styles.detailTextBlock}>
              <Text style={[typography['body-md'], { color: colors['on-surface'] }, styles.detailValueBold]}>
                {t('result.estimatedArrival')}
              </Text>
              <Text style={[typography['body-sm'], { color: colors['on-surface-variant'] }]}>
                {etaText}
              </Text>
            </View>
          </View>

          {/* 段 3：收货地址（location_on 图标） */}
          <View style={[styles.detailRow, styles.detailRowTopPad]}>
            <View style={[styles.detailIcon, { backgroundColor: colors['surface-container'] }]}>
              <Icon symbol="location_on" size={20} color={colors.secondary} />
            </View>
            <View style={styles.detailTextBlock}>
              <Text style={[typography['body-md'], { color: colors['on-surface'] }, styles.detailValueBold]}>
                {address?.name ?? t('result.defaultRecipient')}
              </Text>
              <Text style={[typography['body-sm'], { color: colors['on-surface-variant'] }]}>
                {address
                  ? `${address.detail}, ${address.district}, ${address.city}`
                  : t('result.defaultAddress')}
              </Text>
            </View>
          </View>
        </View>

        {/* Additional Message — italic 邮件提示 */}
        <Text style={[typography['body-sm'], { color: colors['on-surface-variant'] }, styles.extraNote]}>
          {t('result.confirmationNote')}
        </Text>
      </ScrollView>

      {/* Sticky Actions Bar — 纵向两按钮（HTML: TRACK ORDER STATUS primary / CONTINUE SHOPPING outline） */}
      <View style={[styles.actionBar, { borderTopColor: colors['outline-variant'] }]}>
        <Button
          label={t('result.trackOrder')}
          onPress={goTrackOrder}
          fullWidth
          accessibilityHint={t('result.trackOrder')}
        />
        <Button
          variant="outline"
          label={t('result.continueShopping')}
          onPress={goHome}
          fullWidth
          accessibilityHint={t('result.continueShopping')}
        />
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 160 },
  heroWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: { textAlign: 'center', marginBottom: spacing.sm },
  heroDesc: { textAlign: 'center', maxWidth: 280 },
  detailCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailRowBordered: {
    paddingBottom: spacing.sm,
  },
  detailRowTopPad: {
    paddingTop: spacing.sm,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextBlock: {
    flex: 1,
  },
  detailValueBold: {
    fontWeight: '700',
  },
  extraNote: {
    marginTop: spacing.xl,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    backgroundColor: '#ffffff',
  },
});
