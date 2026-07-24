// ⚠️ 无 HTML 原型，参考 OrderDetailPage 推导实现，待设计确认
// AfterSalesDetailPage - 售后详情（参考 OrderDetailPage 的状态色块 + 时间轴 + 价格汇总）
// D.6: PrimaryHeader + 状态色块 + 商品 + 时间轴 + 退款金额 + 客服按钮
//
// TODO(长期): 后端售后接口就绪后改造
// 1. src/services/afterSales.ts: getAfterSalesDetail(id), createAfterSales(orderId, payload)
// 2. src/services/queries/useAfterSales.ts: useAfterSalesDetail(id), useCreateAfterSales()
// 3. apply 改用 useCreateAfterSales，提交后用返回的 afterSalesId 跳 detail
// 4. detail 改用 useAfterSalesDetail(id)，id 语义从 orderId 改成 afterSalesId
// 5. 时间轴/申请号/申请时间从 mock 改为真实数据
// 6. 「取消申请」按钮调 cancelAfterSales(afterSalesId)
import { StyleSheet, View, Text, ScrollView, Image, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { PriceText } from '@/components/ui/PriceText';
import { TimelineStep } from '@/components/business/TimelineStep';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useOrder } from '@/services/queries/useOrders';
import { useLocalizer } from '@/i18n';
import { toast } from '@/store/toastStore';
import type { OrderStatus } from '@/types';

// 售后处理中状态色（琥珀）：HTML 用 amber-500/700，与 semantic.warning（橙）色阶不同，
// 单点使用不立项 token，保留 hex + 豁免尾注（见 check-hardcoded-colors.sh）。
const REFUND_STATUS_ICON = '#f59e0b'; // 原因：售后处理中琥珀图标（amber-500）
const REFUND_STATUS_TEXT = '#b45309'; // 原因：售后处理中深琥珀文字（amber-700）

type StepKey =
  | 'submitted'
  | 'reviewing'
  | 'approved'
  | 'refund'
  | 'completed'
  | 'rejected'
  | 'cancelled';

const STEP_ICON: Record<StepKey, string> = {
  submitted: 'edit',
  reviewing: 'visibility',
  approved: 'check_circle',
  refund: 'payments',
  completed: 'verified',
  rejected: 'cancel',
  cancelled: 'close',
};

// Why: 根据 order.status 推导售后单当前阶段（短期，长期接 useAfterSalesDetail 替换）
function deriveStepKey(status: OrderStatus): StepKey {
  if (status === 'COMPLETED' || status === 'DELIVERED_PAID') return 'reviewing';
  if (status === 'CANCELLED') return 'cancelled';
  return 'submitted';
}

export default function AfterSalesDetailPage() {
  const handleBack = useSafeBack();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const localize = useLocalizer();
  // Why: 短期 id 语义 = orderId（apply 提交时传入），长期改为 afterSalesId
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading, isError, refetch } = useOrder(id);

  if (isLoading) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <PrimaryHeader
          title={t('afterSales.detailTitle')}
          showBack
          onBackPress={handleBack}
        />
        <LoadingOverlay visible />
      </SafeAreaWrapper>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <PrimaryHeader
          title={t('afterSales.detailTitle')}
          showBack
          onBackPress={handleBack}
        />
        <ErrorState
          message={t('errors.orderNotFound', { defaultValue: 'Order not found' })}
          onRetry={() => refetch()}
        />
      </SafeAreaWrapper>
    );
  }

  const item = order.items[0];
  const product = item?.product;
  const quantity = item?.quantity ?? 1;
  const refundAmount = order.totalPrice;
  const stepKey = deriveStepKey(order.status);

  // TODO(长期): 时间轴从 useAfterSalesDetail 拿真实数据
  const steps = [
    {
      status: t('afterSales.timeline.submitted'),
      description: t('afterSales.timeline.submittedDesc'),
      timestamp: '2026-06-13 10:00',
    },
    {
      status: t('afterSales.timeline.reviewing'),
      description: t('afterSales.timeline.reviewingDesc'),
      timestamp: '2026-06-13 14:00',
    },
    {
      status: t('afterSales.timeline.approved'),
      description: t('afterSales.timeline.approvedDesc'),
      timestamp: '2026-06-14 09:00',
    },
    {
      status: t('afterSales.timeline.completed'),
      description: t('afterSales.timeline.completedDesc'),
      timestamp: '2026-06-14 11:00',
    },
  ];

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={t('afterSales.detailTitle')}
        showBack
        onBackPress={handleBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 状态色块 */}
        <View style={[styles.statusBlock, { backgroundColor: colors.semantic['warning-container'] }, shadowPresets.sm]}>
          <View style={styles.statusPattern} pointerEvents="none">
            <TaisPattern width={400} height={100} opacity={0.2} />
          </View>
          <View style={styles.statusIconWrap}>
            <View style={[styles.statusIcon, { backgroundColor: REFUND_STATUS_ICON }]}>
              <Icon symbol={STEP_ICON[stepKey]} size={22} color="#ffffff" />
            </View>
          </View>
          <View style={styles.statusTextBox}>
            <Text style={[styles.statusText, { color: REFUND_STATUS_TEXT }]} accessibilityRole="header">
              {t('afterSales.processing')}
            </Text>
            <Text style={[styles.statusDesc, { color: REFUND_STATUS_TEXT, opacity: 0.7 }]}>
              {t('afterSales.processingDesc')}
            </Text>
          </View>
        </View>

        {/* 商品卡片 - 真实订单商品 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon symbol="shopping_cart" size={18} color={colors.primary} />
            <Text style={[styles.cardHeaderText, { color: colors.primary }]}>
              {t('afterSales.productLabel', { defaultValue: 'Product' })}
            </Text>
          </View>
          <View style={styles.productRow}>
            <View style={[styles.productImgWrap, { backgroundColor: colors['surface-container'] }]}>
              {product?.image && (
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImg}
                  resizeMode="cover"
                />
              )}
            </View>
            <View style={styles.productTextBox}>
              <Text style={[styles.productName, { color: colors['on-surface'] }]} numberOfLines={2}>
                {product ? localize(product.name) : t('afterSales.mockProduct')}
              </Text>
              <View style={styles.productMetaRow}>
                <Text style={[styles.productMeta, { color: colors['on-surface-variant'] }]}>
                  × {quantity}
                </Text>
                <PriceText value={product?.price ?? 0} size="md" />
              </View>
            </View>
          </View>
        </View>

        {/* 退款金额卡片 - 真实订单总价 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon symbol="payments" size={18} color={colors.primary} />
            <Text style={[styles.cardHeaderText, { color: colors.primary }]}>
              {t('afterSales.refundAmount')}
            </Text>
          </View>
          <View style={styles.refundAmountRow}>
            <PriceText value={refundAmount} size="lg" />
            <View style={[styles.refundPill, { backgroundColor: colors.semantic['positive-container'] }]}>
              <Text style={[styles.refundPillText, { color: colors.semantic.positive }]}>
                {t('afterSales.refundMethod', { defaultValue: 'Original payment' })}
              </Text>
            </View>
          </View>
          <Text style={[styles.refundNote, { color: colors['on-surface-variant'] }]}>
            {t('afterSales.refundNote', {
              defaultValue: 'Refund will be processed within 1-3 business days',
            })}
          </Text>
        </View>

        {/* 进度时间轴卡片 - TODO(长期): 接 useAfterSalesDetail */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon symbol="timeline" size={18} color={colors.primary} />
            <Text style={[styles.cardHeaderText, { color: colors.primary }]}>
              {t('afterSales.progressLabel')}
            </Text>
          </View>
          <TimelineStep steps={steps} currentIndex={2} />
        </View>

        {/* 申请信息卡片 - TODO(长期): 接 useAfterSalesDetail */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon symbol="receipt_long" size={18} color={colors.primary} />
            <Text style={[styles.cardHeaderText, { color: colors.primary }]}>
              {t('afterSales.applyInfo')}
            </Text>
          </View>

          <InfoRow
            label={t('afterSales.applyNo')}
            value="AS202606130001"
            subColor={colors['on-surface-variant']}
            textColor={colors['on-surface']}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />
          <InfoRow
            label={t('afterSales.reason')}
            value={t('afterSales.mockReason')}
            subColor={colors['on-surface-variant']}
            textColor={colors['on-surface']}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />
          <InfoRow
            label={t('afterSales.applyTime')}
            value="2026-06-13 10:00"
            subColor={colors['on-surface-variant']}
            textColor={colors['on-surface']}
          />
        </View>
      </ScrollView>

      {/* 底部客服按钮 */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderTopColor: colors['outline-variant'],
          },
          shadowPresets.md,
        ]}
      >
        <Pressable
          onPress={() => router.push('/service')}
          style={({ pressed }) => [
            styles.csBtn,
            { borderColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('afterSales.contactService')}
          testID="aftersales-cs"
        >
          <Icon symbol="headset" size={18} color={colors.primary} />
          <Text style={[styles.csText, { color: colors.primary }]}>
            {t('afterSales.contactService')}
          </Text>
        </Pressable>

        {/* TODO(长期): 后端售后接口支持取消时，onPress 改为调 cancelAfterSales(afterSalesId) */}
        <Pressable
          onPress={() =>
            toast.info(
              t('afterSales.cancelNotSupported', {
                defaultValue: 'Cancel after-sales is not supported yet',
              }),
            )
          }
          style={({ pressed }) => [
            styles.cancelBtn,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('afterSales.cancelApply', { defaultValue: 'Cancel Apply' })}
          testID="aftersales-cancel"
        >
          <Text style={styles.cancelText}>
            {t('afterSales.cancelApply', { defaultValue: 'Cancel Apply' })}
          </Text>
        </Pressable>
      </View>
    </SafeAreaWrapper>
  );
}

function InfoRow({
  label,
  value,
  subColor,
  textColor,
}: {
  label: string;
  value: string;
  subColor: string;
  textColor: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: subColor }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout['container-margin'],
    paddingBottom: 120,
    gap: spacing.md,
  },
  statusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  statusPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statusIconWrap: {
    zIndex: 2,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextBox: {
    flex: 1,
    gap: 2,
    zIndex: 2,
  },
  statusText: {
    ...typography.h3,
    fontWeight: '700',
  },
  statusDesc: {
    ...typography['body-sm'],
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  cardHeaderText: {
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 11,
  },
  productRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  productImgWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  productTextBox: {
    flex: 1,
    gap: 4,
  },
  productName: {
    ...typography['body-sm'],
    lineHeight: 18,
    fontWeight: '500',
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  productMeta: {
    ...typography['label-caps'],
    fontSize: 11,
  },
  refundAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  refundPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  refundPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  refundNote: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 0,
  },
  infoLabel: {
    ...typography['body-sm'],
  },
  infoValue: {
    ...typography['body-sm'],
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  csBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  csText: {
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 13,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  cancelText: {
    color: '#ffffff',
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 13,
  },
});
