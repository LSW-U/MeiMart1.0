// OrderDetailPage — 真实设计源是 DeliveryTrackingPage[1/2/3].html 三个状态
// （PROCESSING / SHIPPED / DELIVERED）。原 OrderDetailPage.html 是 0 字节空文件。
// ADR-0004：推翻 ADR-0002 的 Section 组件方案，参照 tracking.tsx 重写为单文件。
//
// 批5 拆分（C-P3-14）：STATUS_VISUAL/ON_PRIMARY 抽到 order-detail/shared.tsx，
//   Header/Timeline/BottomActions（含 handleRepeatOrder）抽到 order-detail/sections/。
//   主文件保留路由壳 + 数据组装 + OrderItemRow/SummaryRow，行为零变更（纯搬移）。
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
} from 'react-native';
import { useState } from 'react';
import * as expoClipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { formatDate, formatEta, maskPhone, formatPrice } from '@/utils/format';
import { buildTimelineSteps } from '@/utils/timeline';
import { RiderCard, getRiderStatusTag } from '@/components/business/RiderCard';
import {
  useTheme,
  spacing,
  layout,
  typography,
  borderRadius,
  shadowPresets,
  statusBannerPalettes,
} from '@/theme';
import { useLocalizer } from '@/i18n';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { StatusBadge } from '@/components/business/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import { useOrder, useCancelOrder, useDecideSuggestion } from '@/services/queries/useOrders';
import { useOrderEta } from '@/services/queries/useOrderEta';
import { toast } from '@/store/toastStore';
import type { CartItem, LocalizableText } from '@/types';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { STATUS_VISUAL } from './order-detail/shared';
import { Header } from './order-detail/sections/Header';
import { Timeline } from './order-detail/sections/Timeline';
import { BottomActions } from './order-detail/sections/BottomActions';

// Why: 弹层 Accept 按钮固定白字（primary 红底）——dark 模式 on-primary 翻暗红会裂色，
// 同 checkout.tsx ON_PRIMARY 口径
const ON_PRIMARY_SUGGESTION = '#ffffff';

// === Page ===

export default function OrderDetailPage() {
  const handleBack = useSafeBack();
  const { t, i18n } = useTranslation();
  const localize = useLocalizer();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const cancelMutation = useCancelOrder();
  // 替换品批1（2026-10-29 D5/D8/D1）：建议决策 mutation（确认弹层双按钮共用）
  const decideSuggestion = useDecideSuggestion();
  // P10：轻量 ETA（仅 PICKED/OUT_FOR_DELIVERY 发请求）。hooks 规则 —— 必须在早返回之前无条件调用，
  // status 用 order?.status 兜底（loading 阶段 order 为 undefined）。
  const { data: eta } = useOrderEta(id, order?.status ?? 'PENDING_PAYMENT');
  // 替换品批1（2026-10-29）：PENDING 建议确认弹层状态（null = 关闭；值 = 待决策的 item）。
  // hooks 规则 —— 必须在早返回之前无条件调用（eslint react-hooks/rules-of-hooks）。
  const [suggestionTarget, setSuggestionTarget] = useState<CartItem | null>(null);

  if (isLoading) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <Header title={t('order.detail')} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
        <Header title={t('order.detail')} />
        <ErrorState message={t('order.notFoundError')} onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

  const visual = STATUS_VISUAL[order.status];
  const statusTheme = statusBannerPalettes[visual.palette];
  // Why: OUT_FOR_DELIVERY 且拿到真实 ETA（DeliveryTask.estimatedArrival）→ 显示「Arriving <eta>」；
  // 否则 fallback 到 STATUS_VISUAL 配置文案（formatEta locale 映射收口在 format.ts toIntlLocale）
  const bannerValue =
    order.status === 'OUT_FOR_DELIVERY' && eta
      ? t('order.bannerValue.arrivingEta', { eta: formatEta(eta, i18n.language) })
      : t(visual.bannerValueKey);
  // Why: P10 §8.1 D1 - 费用从 transformOrder 映射的字段读取，消除 2.0/5.0 写死（mock 无字段时降级 0）
  // C-P3-3（批4）：Math.max(0, ...) 防负值——异常数据（运费>商品小计）时 subtotal 显示 0 而非负数
  const shippingFee = order.deliveryFee ?? 0;
  const discount = order.discountAmount ?? 0;
  const subtotal = Math.max(0, order.totalPrice + discount - shippingFee);

  const timelineSteps = buildTimelineSteps(
    order.status,
    order,
    i18n.language,
    {
      confirmed: { label: t('order.timeline.submitted'), desc: t('order.timeline.submittedDesc') },
      processing: { label: t('order.timeline.paid'), desc: t('order.timeline.paidDesc') },
      shipped: { label: t('order.timeline.shipped'), desc: t('order.timeline.shippedDesc') },
      delivered: { label: t('order.timeline.delivered'), desc: t('order.timeline.deliveredDesc') },
      cancelled: { label: t('order.timeline.cancelled'), desc: t('order.timeline.cancelledDesc') },
    },
    visual.bannerIconSymbol,
  );
  const activeIndex = timelineSteps.findIndex((s) => s.state === 'active');
  const timelineProgress = activeIndex < 0 ? 1 : (activeIndex + 1) / timelineSteps.length;

  const handleDecide = (accept: boolean) => {
    if (!suggestionTarget || !order) return;
    decideSuggestion.mutate(
      { orderId: order.id, itemId: suggestionTarget.id, input: { accept } },
      {
        onSuccess: (res) => {
          setSuggestionTarget(null);
          if (accept) {
            toast.success(
              t('order.suggestion.acceptedToast', {
                defaultValue: 'Replacement confirmed',
              }),
            );
            if (res.refundedAmount > 0) {
              toast.success(
                t('order.suggestion.refundToast', {
                  amount: formatPrice(res.refundedAmount / 100),
                  defaultValue: 'Refund ${{amount}} issued for the price difference',
                }),
              );
            }
          } else {
            toast.success(
              t('order.suggestion.declinedToast', {
                defaultValue: 'Declined — refund processing',
              }),
            );
          }
        },
        onError: (err) => {
          const errCode = (err as { response?: { data?: { error?: { code?: string } } } })?.response
            ?.data?.error?.code;
          toast.error(
            errCode ? t(`errors.${errCode}`, { defaultValue: String(errCode) }) : t('common.error'),
          );
        },
      },
    );
  };

  const cancel = () => {
    // Why: Web 端 Alert 不显示，直接取消 + toast；Native 端用 Alert 确认
    if (Platform.OS === 'web') {
      cancelMutation.mutate(order.id, {
        onSuccess: () => {
          toast.success(t('order.cancelled', { defaultValue: 'Order cancelled' }));
          handleBack();
        },
      });
      return;
    }
    Alert.alert(t('order.cancelTitle'), t('order.cancelConfirm'), [
      { text: t('common.no', { defaultValue: 'No' }), style: 'cancel' },
      {
        text: t('common.confirm', { defaultValue: 'Confirm' }),
        style: 'destructive',
        onPress: () => cancelMutation.mutate(order.id, { onSuccess: handleBack }),
      },
    ]);
  };

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <Header title={t('order.detail')} orderNo={order.orderNo} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Header Card（HTML 第 158-175 行：ORDER NUMBER + status badge + ETA banner） */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
            },
            shadowPresets.umaLulik,
          ]}
        >
          <View style={styles.orderHeaderRow}>
            <View style={styles.flex1}>
              <Text style={[styles.labelCaps, { color: colors['on-surface-variant'] }]}>
                {t('order.orderNo', { defaultValue: 'ORDER NUMBER' }).toUpperCase()}
              </Text>
              <View style={styles.orderNoRow}>
                <Text style={[styles.priceDisplay, { color: colors['on-surface'] }]}>
                  {order.orderNo}
                </Text>
                {/* V16：订单号旁复制小按钮（原型 content_copy） */}
                <Pressable
                  onPress={() => {
                    const no = order.orderNo;
                    if (Platform.OS === 'web') {
                      // F7：web 保留 navigator.clipboard（expo-clipboard web 也走它，直连少一层）
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(no).catch(() => {});
                      }
                    } else {
                      // F7：native 迁 expo-clipboard（RN core Clipboard 已废弃，未来版本移除）
                      expoClipboard.setStringAsync(no).catch(() => {});
                    }
                    toast.success(t('order.copied', { defaultValue: 'Copied' }));
                  }}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={t('order.copyOrderNo', { defaultValue: 'Copy order number' })}
                  testID="order-copy-no"
                >
                  <Icon symbol="content_copy" size={14} color={colors['on-surface-variant']} />
                </Pressable>
              </View>
              <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                {t('order.createdAt', { defaultValue: 'Placed' })}{' '}
                {formatDate(order.createdAt, i18n.language)}
              </Text>
            </View>
            <StatusBadge
              text={t(visual.badgeTextKey).toUpperCase()}
              backgroundColor={statusTheme.badgeBg}
            />
          </View>

          {/* Delivery banner（HTML 第 168-174 行：状态色边浅底 + icon + 标签 + 描述） */}
          <View
            style={[
              styles.etaRow,
              {
                backgroundColor: statusTheme.bannerBg,
                borderColor: statusTheme.bannerBorder,
              },
            ]}
          >
            <Icon symbol={visual.bannerIconSymbol} size={20} color={statusTheme.bannerIcon} />
            <View style={styles.flex1}>
              <Text style={[styles.etaLabel, { color: statusTheme.bannerLabelColor }]}>
                {t(visual.bannerLabelKey).toUpperCase()}
              </Text>
              <Text style={[styles.etaValue, { color: statusTheme.bannerValueColor }]}>
                {bannerValue}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Address Card（HTML 第 177-189 行） */}
        {order.address ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors['surface-container-lowest'],
                borderColor: colors['outline-variant'],
              },
              shadowPresets.umaLulik,
            ]}
          >
            <View style={styles.addressHeaderRow}>
              <View style={styles.addressTitleRow}>
                <Icon symbol="location_on" size={20} color={colors.primary} />
                <Text style={[styles.addressTitle, { color: colors['on-surface'] }]}>
                  {t('order.shippingInfo', { defaultValue: 'Delivery Address' })}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  // A-P2-7（D6）: 订单页地址入口维持管理模式，D6 选择语义不再使用
                  //（审查 P2-1 拍板 a，20261010）
                  router.push('/address/list')
                }
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('checkout.address.change', { defaultValue: 'Edit' })}
              >
                <Text style={[styles.editText, { color: colors.primary }]}>
                  {t('checkout.address.change', { defaultValue: 'EDIT' }).toUpperCase()}
                </Text>
              </Pressable>
            </View>
            <View style={styles.addressBody}>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
                {order.address.name}
              </Text>
              <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                {/* C-P3-6（批4）：收货人手机号脱敏展示（utils/format maskPhone，读屏/截图不泄露全号） */}
                {maskPhone(order.address.phone)}
              </Text>
              <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                {order.address.province}
                {order.address.city}
                {order.address.district}
                {order.address.detail}
              </Text>
            </View>
          </View>
        ) : null}

        {/* P10 §3.5 骑手联系卡（rider 字段存在 + 配送中/已完成状态显示，无 rider 字段时隐藏整个模块 - 后端项 1 就绪后透传） */}
        {order.rider && getRiderStatusTag(order.status) ? (
          <RiderCard rider={order.rider} orderStatus={order.status} />
        ) : null}

        {/* Order Items 标题（HTML 第 191-196 行 — 左右渐变 divider） */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDivider, { backgroundColor: colors['outline-variant'] }]} />
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('order.items', { defaultValue: 'Order Items' })}
          </Text>
          <View style={[styles.sectionDivider, { backgroundColor: colors['outline-variant'] }]} />
        </View>

        {/* 商品列表（HTML 第 198-237 行 — 每商品独立卡片） */}
        <View style={styles.itemList}>
          {order.items.map((item) => (
            <OrderItemRow
              key={item.id}
              item={item}
              localize={localize}
              onPress={() => router.push(`/product/${item.product.id}`)}
              onDecide={
                item.suggestionStatus === 'PENDING' ? () => setSuggestionTarget(item) : undefined
              }
            />
          ))}
        </View>

        {/* 替换品批1（2026-10-29 D5/D8）：PENDING 建议确认弹层（原品/替换品对比 + 差额明示） */}
        <SuggestionConfirmModal
          visible={suggestionTarget != null}
          item={suggestionTarget}
          localize={localize}
          busy={decideSuggestion.isPending}
          onAccept={() => handleDecide(true)}
          onDecline={() => handleDecide(false)}
          onClose={() => setSuggestionTarget(null)}
        />

        {/* Order Summary Card（HTML 第 240-258 行） */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
            },
            shadowPresets.umaLulik,
          ]}
        >
          <Text style={[styles.labelCaps, { color: colors['on-surface-variant'] }]}>
            {t('order.priceSummary', { defaultValue: 'ORDER SUMMARY' }).toUpperCase()}
          </Text>
          <View style={styles.summaryGap}>
            <SummaryRow
              label={t('order.subtotal', { defaultValue: 'Subtotal' })}
              value={formatPrice(subtotal)}
              color={colors['on-surface']}
            />
            <SummaryRow
              label={t('order.shipping', { defaultValue: 'Delivery Fee' })}
              value={formatPrice(shippingFee)}
              color={colors['on-surface']}
            />
            <SummaryRow
              label={t('order.discount', { defaultValue: 'Discount' })}
              value={formatPrice(-discount, 'USD', 2, { sign: true })} // 批2 M3：原 `-${formatPrice(...)}` 前缀手拼收口 sign 档（负值 → `-$x.xx`）
              color={colors.semantic.success}
            />
            <View style={[styles.totalRow, { borderTopColor: colors['outline-variant'] }]}>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
                {t('order.total', { defaultValue: 'Total Amount' })}
              </Text>
              <Text style={[styles.priceDisplayLg, { color: colors.primary }]}>
                {formatPrice(order.totalPrice)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment & Timeline Card（HTML 第 260-293 行 — 合并卡） */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
            },
            shadowPresets.umaLulik,
          ]}
        >
          {/* Payment Method */}
          <View style={styles.paymentSection}>
            <Text style={[styles.labelCaps, { color: colors['on-surface-variant'] }]}>
              {/* Why: checkout.payment 在 locales 里是对象（支付方式 id→文案映射），当字符串用会抛
                  "RETURNED AN OBJECT INSTEAD OF STRING"；改用既有字符串 key order.paymentMethodLabel */}
              {t('order.paymentMethodLabel', { defaultValue: 'PAYMENT METHOD' }).toUpperCase()}
            </Text>
            <View style={styles.paymentRow}>
              <View style={[styles.laisPayBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.laisPayText}>
                  {t(`order.paymentMethodShort.${(order.paymentMethod ?? 'cod').toLowerCase()}`, {
                    defaultValue: order.paymentMethod ?? '-',
                  })}
                </Text>
              </View>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
                {t(`order.paymentMethod.${(order.paymentMethod ?? 'cod').toLowerCase()}`, {
                  defaultValue: order.paymentMethod ?? '-',
                })}
              </Text>
            </View>
          </View>

          {/* Timeline */}
          <Timeline steps={timelineSteps} progress={timelineProgress} />
        </View>
      </ScrollView>

      {/* Sticky Action Buttons（HTML 第 296-305 行 — 2 列 grid） */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderTopColor: colors['outline-variant'],
          },
        ]}
      >
        <BottomActions status={order.status} order={order} onCancel={cancel} />
      </View>
    </SafeAreaWrapper>
  );
}

// === Sub-components ===

function OrderItemRow({
  item,
  localize,
  onPress,
  onDecide,
}: {
  item: CartItem;
  localize: (text: LocalizableText) => string;
  onPress: () => void;
  onDecide?: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.itemCard,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderColor: colors['outline-variant'],
        },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('order.viewProductA11y', {
        name: localize(item.product.name),
        defaultValue: 'View product: {{name}}',
      })}
    >
      <View style={[styles.itemImageWrap, { backgroundColor: colors['surface-variant'] }]}>
        <SafeImage source={{ uri: item.product.image }} style={styles.itemImage} />
      </View>
      <View style={styles.itemInfo}>
        <View>
          <Text style={[styles.itemName, { color: colors['on-surface'] }]} numberOfLines={1}>
            {localize(item.product.name)}
          </Text>
          <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
            {t('order.qtyLabel', { defaultValue: 'Qty' })}: {item.quantity}
          </Text>
          {/* 缺货履约闭环批2（2026-10-24）：缺货项标记（A4 前置）——批1 后端 OrderItem
              透出 outOfStockQty（可空），推送深链跳本页可见。null = 未登记缺货隐藏 */}
          {item.outOfStockQty != null ? (
            <View
              accessibilityRole="text"
              accessibilityLabel={t('order.outOfStockBadgeA11y', {
                defaultValue: 'Item out of stock',
              })}
              style={[styles.oosBadge, { backgroundColor: colors['error-container'] }]}
            >
              <Text style={[styles.oosBadgeText, { color: colors.error }]}>
                {t('order.outOfStockBadge', {
                  qty: item.outOfStockQty,
                  defaultValue: 'Out of stock ×{{qty}}',
                })}
              </Text>
            </View>
          ) : null}
          {/* 替换品批1（2026-10-29）：建议状态徽标——PENDING 可点开确认弹层；
              ACCEPTED/DECLINED 只读结果。null = 无建议不渲染 */}
          {item.suggestionStatus === 'PENDING' ? (
            <Pressable
              onPress={onDecide}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={t('order.suggestion.reviewA11y', {
                defaultValue: 'Review replacement suggestion',
              })}
              style={[styles.oosBadge, { backgroundColor: colors['primary-container'] }]}
            >
              <Text style={[styles.oosBadgeText, { color: colors.primary }]}>
                {t('order.suggestion.pendingBadge', {
                  defaultValue: 'Replacement suggestion — tap to decide',
                })}
              </Text>
            </Pressable>
          ) : item.suggestionStatus === 'ACCEPTED' ? (
            <View
              accessibilityRole="text"
              style={[styles.oosBadge, { backgroundColor: colors['primary-container'] }]}
            >
              <Text style={[styles.oosBadgeText, { color: colors.primary }]}>
                {t('order.suggestion.acceptedBadge', { defaultValue: 'Replaced' })}
              </Text>
            </View>
          ) : item.suggestionStatus === 'DECLINED' ? (
            <View
              accessibilityRole="text"
              style={[styles.oosBadge, { backgroundColor: colors['surface-variant'] }]}
            >
              <Text style={[styles.oosBadgeText, { color: colors['on-surface-variant'] }]}>
                {t('order.suggestion.declinedBadge', { defaultValue: 'Replacement declined' })}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.priceDisplay, { color: colors.primary }]}>
          {formatPrice(item.product.price * item.quantity)}
        </Text>
      </View>
    </Pressable>
  );
}

// 替换品批1（2026-10-29 D5/D8）：PENDING 建议确认弹层。
// Why: P2-3 修复（2026-10-29）——后端契约增补 item.suggestionItem 摘要（目标行快照，
// 决策前真实替换价），弹层渲染真实原/替两行对比 + 差额行（D1 clamp min：替换价 ≤ 原价，
// 差额只降不升，前端明示）。suggestionItem 缺失时（后端未升级）降级为单行展示。
function SuggestionConfirmModal({
  visible,
  item,
  localize,
  busy,
  onAccept,
  onDecline,
  onClose,
}: {
  visible: boolean;
  item: CartItem | null;
  localize: (text: LocalizableText) => string;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!visible || !item) return null;
  const suggestion = item.suggestionItem ?? null;
  // 差额（元）：原价 − 替换价 ≥ 0（D1 clamp）；>0 退款 / =0 同价
  const diff =
    suggestion != null ? Math.round(item.product.price * 100) - suggestion.unitPrice : null; // 分
  return (
    <View
      style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
      accessibilityLabel={t('order.suggestion.modalA11y', {
        defaultValue: 'Replacement suggestion confirmation',
      })}
    >
      <View
        style={[
          styles.modalCard,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderColor: colors['outline-variant'],
          },
        ]}
      >
        <Text style={[styles.modalTitle, { color: colors['on-surface'] }]}>
          {t('order.suggestion.title', { defaultValue: 'Replacement suggestion' })}
        </Text>
        <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
          {t('order.suggestion.desc', {
            name: localize(item.product.name),
            qty: item.quantity,
            defaultValue:
              'Item {{name}} ×{{qty}} is out of stock. Warehouse suggests a replacement at the same or lower price.',
          })}
        </Text>
        {suggestion != null ? (
          // 真对比：原项行 + 替换项行 + 差额行（P2-3）
          <View style={styles.modalCompare}>
            <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
              {t('order.suggestion.originalLabel', { defaultValue: 'Original item' })}
            </Text>
            <View style={styles.modalItemRow}>
              <View style={[styles.itemImageWrap, { backgroundColor: colors['surface-variant'] }]}>
                <SafeImage source={{ uri: item.product.image }} style={styles.itemImage} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.itemName, { color: colors['on-surface'] }]} numberOfLines={2}>
                  {localize(item.product.name)}
                </Text>
                <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                  {t('order.qtyLabel', { defaultValue: 'Qty' })}: {item.quantity}
                </Text>
              </View>
              <Text style={[styles.priceDisplay, { color: colors['on-surface'] }]}>
                {formatPrice(item.product.price * item.quantity)}
              </Text>
            </View>
            <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
              {t('order.suggestion.replacementLabel', { defaultValue: 'Suggested replacement' })}
            </Text>
            <View style={styles.modalItemRow}>
              <View style={[styles.itemImageWrap, { backgroundColor: colors['surface-variant'] }]}>
                <SafeImage
                  source={{ uri: suggestion.image ?? item.product.image }}
                  style={styles.itemImage}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.itemName, { color: colors['on-surface'] }]} numberOfLines={2}>
                  {localize((suggestion.name ?? {}) as LocalizableText)}
                </Text>
                <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                  {t('order.qtyLabel', { defaultValue: 'Qty' })}: {item.quantity}
                </Text>
              </View>
              <Text style={[styles.priceDisplay, { color: colors.primary }]}>
                {formatPrice((suggestion.unitPrice * item.quantity) / 100)}
              </Text>
            </View>
            {diff != null && (
              <View style={styles.modalDiffRow}>
                <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
                  {t('order.suggestion.priceDiff', { defaultValue: 'Price difference' })}
                </Text>
                <Text style={[styles.bodyMdBold, { color: colors.primary }]}>
                  {diff > 0
                    ? t('order.suggestion.diffSave', {
                        amount: formatPrice((diff * item.quantity) / 100),
                        defaultValue: 'You save {{amount}}',
                      })
                    : t('order.suggestion.diffEqual', {
                        defaultValue: 'Same price — no extra charge',
                      })}
                </Text>
              </View>
            )}
            <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
              {t('order.suggestion.note', {
                defaultValue:
                  'If the replacement costs less than the original, the difference will be refunded automatically.',
              })}
            </Text>
          </View>
        ) : (
          // 降级：无 suggestionItem 摘要 → 单行展示当前项（后端未升级）
          <View style={styles.modalItemRow}>
            <View style={[styles.itemImageWrap, { backgroundColor: colors['surface-variant'] }]}>
              <SafeImage source={{ uri: item.product.image }} style={styles.itemImage} />
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.itemName, { color: colors['on-surface'] }]} numberOfLines={2}>
                {localize(item.product.name)}
              </Text>
              <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                {t('order.qtyLabel', { defaultValue: 'Qty' })}: {item.quantity}
              </Text>
            </View>
            <Text style={[styles.priceDisplay, { color: colors.primary }]}>
              {formatPrice(item.product.price * item.quantity)}
            </Text>
          </View>
        )}
        <View style={styles.modalActions}>
          <Pressable
            onPress={onDecline}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('order.suggestion.declineA11y', {
              defaultValue: 'Decline and refund',
            })}
            style={[
              styles.modalBtn,
              { backgroundColor: colors['surface-variant'], opacity: busy ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
              {t('order.suggestion.decline', { defaultValue: 'Decline & refund' })}
            </Text>
          </Pressable>
          <Pressable
            onPress={onAccept}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('order.suggestion.acceptA11y', {
              defaultValue: 'Accept replacement',
            })}
            style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: busy ? 0.5 : 1 }]}
          >
            <Text style={[styles.bodyMdBold, { color: ON_PRIMARY_SUGGESTION }]}>
              {t('order.suggestion.accept', { defaultValue: 'Accept' })}
            </Text>
          </Pressable>
        </View>
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" disabled={busy}>
          <Text
            style={[styles.bodySm, { color: colors['on-surface-variant'], textAlign: 'center' }]}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.bodySm, { color }]}>{label}</Text>
      <Text style={[styles.bodySm, { color, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout['container-margin'],
    gap: spacing.md,
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: { flex: 1 },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  // Order Header Card
  // V16：订单号 + 复制按钮同行
  orderNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  labelCaps: {
    ...typography['label-caps'],
    marginBottom: spacing.xs,
  },
  priceDisplay: {
    ...typography['price-display'],
    fontWeight: '700',
    marginBottom: 2,
  },
  priceDisplayLg: {
    ...typography['price-display'],
    fontSize: 24,
    fontWeight: '700',
  },
  bodySm: {
    ...typography['body-sm'],
  },
  bodyMdBold: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  // ETA banner
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  etaLabel: {
    ...typography['label-caps'],
    fontSize: 10,
    marginBottom: 2,
  },
  etaValue: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  // Address
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addressTitle: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  editText: {
    ...typography['label-caps'],
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  addressBody: {
    paddingLeft: 28,
    gap: 2,
  },
  // Section header (with gradient divider)
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionDivider: {
    height: 2,
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  // Items
  itemList: {
    gap: spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.sm,
  },
  // 缺货履约闭环批2：缺货标记 badge（自起点小胶囊，error-container 底 + error 字）
  oosBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  oosBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // 替换品批1：建议确认弹层（全屏遮罩 + 底部卡片，避免引新依赖照 Modal 语义手写）
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 100,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // P2-3：真对比块（两行商品 + 差额行）纵向间距
  modalCompare: {
    gap: spacing.xs,
  },
  modalDiffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  itemImageWrap: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemInfo: {
    flex: 1,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  itemName: {
    ...typography['body-md'],
    fontWeight: '700',
    marginBottom: 2,
  },
  // Summary
  summaryGap: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginTop: spacing.xs,
  },
  // Payment & Timeline
  paymentSection: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  laisPayBadge: {
    width: 40,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laisPayText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
