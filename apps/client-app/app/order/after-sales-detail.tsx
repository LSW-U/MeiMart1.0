// AfterSalesDetailPage - 售后详情页（P14）
// HTML 原型: 第三梯队HTML原型设计/P14-售后详情页-优化原型.html（2026-08-08 已出）
// 数据源: useRefundDetail(refund.id)（P13 提交传 refund.id，after-sales-apply.tsx:165）
//         + 副 useOrder(refund.orderId) 拿商品图片（refund.items 无 image）/整单退款 fallback
// 后端: GET /client/refunds/:id（refund.controller.ts:115）+ POST /client/refunds/:id/cancel（:122）
//
// TODO(后续 commit): S1 状态色块多态化 / P1 多商品列表 / T1 时间轴动态化 / WM1 COD 退款区分
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
import { Icon } from '@/components/ui/Icon';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useOrder } from '@/services/queries/useOrders';
import { useCancelRefund, useRefundDetail } from '@/services/queries/useRefunds';
import { useLocalizer } from '@/i18n';
import { toast } from '@/store/toastStore';
import { formatDate } from '@/utils/format';

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

// Why: 接 refund.status 推导售后单阶段（PENDING/APPROVED/COMPLETED/REJECTED/CANCELLED，后端 refund.service 状态机）
function deriveRefundStepKey(status: string): StepKey {
  if (status === 'COMPLETED') return 'completed';
  if (status === 'REJECTED') return 'rejected';
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'APPROVED') return 'approved';
  return 'submitted'; // PENDING
}

/**
 * reason enum → 前端 i18n key 反向映射（后端返回 enum，详情页展示要本地化）
 * 8 enum 全映射 afterSales.reasons.* key（Commit 3 补全 4 key + 完整映射）
 */
const REFUND_REASON_TO_I18N_KEY: Record<string, string> = {
  EXPIRED: 'afterSales.reasons.expired',
  QUALITY_ISSUE: 'afterSales.reasons.quality',
  WRONG_ITEM: 'afterSales.reasons.wrongItem',
  SHORTAGE: 'afterSales.reasons.shortage',
  DAMAGED: 'afterSales.reasons.damaged',
  OUT_OF_STOCK: 'afterSales.reasons.outOfStock',
  DELIVERY_TOO_SLOW: 'afterSales.reasons.deliveryTooSlow',
  CUSTOMER_CHANGE_MIND: 'afterSales.reasons.changeMind',
  OTHER: 'afterSales.reasons.other',
};

/**
 * 退货退款 reason 启发式（I1 售后类型展示）
 * 商品类问题（发错/质量/损坏）→ 退货退款（骑手上门收回）；其余 → 仅退款
 * TODO: 后端 Refund model 补 refundType 字段后改真实（P13 提交传 + RefundView 返回）
 */
const RETURNABLE_REASONS = new Set(['WRONG_ITEM', 'QUALITY_ISSUE', 'DAMAGED']);

export default function AfterSalesDetailPage() {
  const handleBack = useSafeBack();
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const localize = useLocalizer();
  // Why: id 语义 = refund.id（P13 提交后传 refund.id 跳 detail，after-sales-apply.tsx:165）
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: refund,
    isLoading,
    isError,
    refetch,
  } = useRefundDetail(id);
  // 副：拿商品图片（refund.items 无 image 字段）+ 整单退款时 fallback 商品（refund.items 整单退款为空）
  const { data: order } = useOrder(refund?.orderId);
  const cancelRefund = useCancelRefund();

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

  if (isError || !refund) {
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
          message={t('errors.refundNotFound', { defaultValue: 'Refund not found' })}
          onRetry={() => refetch()}
        />
      </SafeAreaWrapper>
    );
  }

  // 商品 fallback：refund.items[0]（部分退款，productName 多语言）→ order.items 匹配（图片）→ order.items[0]（整单退款 fallback）
  // Why: 整单退款时 refund.items 为空数组，需 fallback order.items 拿商品；部分退款时 refund.items 无 image，从 order 匹配
  const refundItem = refund.items[0];
  const matchedOrderItem = refundItem
    ? order?.items.find((oi) => oi.id === refundItem.orderItemId)
    : undefined;
  const orderItem = matchedOrderItem ?? order?.items[0];
  const productNameSource = refundItem?.productName ?? orderItem?.product.name;
  const quantity = refundItem?.refundQty ?? orderItem?.quantity ?? 1;
  const productImage = orderItem?.product.image;
  const productPrice = refundItem?.unitPrice ?? orderItem?.product.price ?? 0;
  const refundAmount = refund.amount;
  const stepKey = deriveRefundStepKey(refund.status);

  // reason 反向映射 + 申请号/申请时间（接 refund 真实字段，I2 申请信息真实数据）
  const reasonText = REFUND_REASON_TO_I18N_KEY[refund.reason]
    ? t(REFUND_REASON_TO_I18N_KEY[refund.reason])
    : refund.reason;
  // I1 售后类型：reason 启发式推断（退货退款 vs 仅退款，TODO 后端 refundType 字段）
  const refundTypeLabelKey = RETURNABLE_REASONS.has(refund.reason)
    ? 'afterSales.types.returnRefund'
    : 'afterSales.types.refundOnly';
  const applyTimeDisplay = formatDate(
    refund.createdAt,
    i18n.language === 'zh' ? 'zh-CN' : 'en-US',
  );
  const applyNoDisplay = `#${refund.id.slice(-8).toUpperCase()}`;

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
          <View style={styles.statusIconWrap}>
            <View style={[styles.statusIcon, { backgroundColor: REFUND_STATUS_ICON }]}>
              <Icon symbol={STEP_ICON[stepKey]} size={22} color={colors['on-primary']} />
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
              {productImage && (
                <Image
                  source={{ uri: productImage }}
                  style={styles.productImg}
                  resizeMode="cover"
                />
              )}
            </View>
            <View style={styles.productTextBox}>
              <Text style={[styles.productName, { color: colors['on-surface'] }]} numberOfLines={2}>
                {productNameSource ? localize(productNameSource) : t('afterSales.mockProduct')}
              </Text>
              <View style={styles.productMetaRow}>
                <Text style={[styles.productMeta, { color: colors['on-surface-variant'] }]}>
                  × {quantity}
                </Text>
                <PriceText value={productPrice} size="md" />
              </View>
            </View>
          </View>
        </View>

        {/* 退款金额卡片 - V1 视觉层次化：去 shadow 加 hairline border（商品主卡保留 shadow） */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors['outline-variant'],
            },
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

        {/* 进度时间轴卡片 - V1 视觉层次化（TODO Commit 8 接真实时间轴） */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors['outline-variant'],
            },
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

        {/* 申请信息卡片 - V1 视觉层次化（TODO Commit 3 补售后类型字段） */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors['outline-variant'],
            },
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
            value={applyNoDisplay}
            subColor={colors['on-surface-variant']}
            textColor={colors['on-surface']}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />
          <InfoRow
            label={t('afterSales.typeLabel')}
            value={t(refundTypeLabelKey)}
            subColor={colors['on-surface-variant']}
            textColor={colors['on-surface']}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />
          <InfoRow
            label={t('afterSales.reason')}
            value={reasonText}
            subColor={colors['on-surface-variant']}
            textColor={colors['on-surface']}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />
          <InfoRow
            label={t('afterSales.applyTime')}
            value={applyTimeDisplay}
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

        {/* 取消申请：调 useCancelRefund（后端 POST /client/refunds/:id/cancel，仅 PENDING 可取消，其他阶段 400） */}
        <Pressable
          onPress={() => {
            cancelRefund.mutateAsync(refund.id).catch((err: unknown) => {
              // 原因：onError 已 rollback 乐观，这里只展示错误（后端 400 = 当前阶段不可取消）
              toast.error(
                err instanceof Error
                  ? err.message
                  : t('afterSales.cancelFailed', { defaultValue: 'Cancel failed' }),
              );
            });
          }}
          style={({ pressed }) => [
            styles.cancelBtn,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('afterSales.cancelApply', { defaultValue: 'Cancel Apply' })}
          testID="aftersales-cancel"
        >
          <Text style={[styles.cancelText, { color: colors['on-primary'] }]}>
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
    // 原因：color 移到 inline（access colors['on-primary']），StyleSheet 静态段不能访问 theme
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 13,
  },
});
