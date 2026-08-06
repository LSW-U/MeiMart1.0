/**
 * RiderCard - 骑手联系卡（P10 订单详情 §3.5 + P11 物流追踪 §3.2 共享）
 *
 * 决策 2 状态化增强：
 * - 真实头像（rider.avatar，无则回退 person icon）
 * - 状态标签（ON_THE_WAY / ARRIVED，按 orderStatus 派生）
 * - 配送单数（rider.totalDeliveries，可选）
 *
 * 后端依赖：rider 字段需后端 Order 详情嵌骑手详情（P10+P11 后端需求清单 项 1，方案 A 已定）。
 * 未就绪前由调用方传 mock RiderInfo，real 模式字段缺失时组件自动降级（隐藏头像/单数/电话）。
 */
import { Linking, Pressable, StyleSheet, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, borderRadius } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import type { RiderInfo, OrderStatus } from '@/types';

// Why: RiderInfo 类型抽到 @/types（Order.rider 共用 + 避免循环依赖），此处 re-export 保持调用方 import 兼容
export type { RiderInfo };

type RiderStatusTag = 'ON_THE_WAY' | 'ARRIVED';

// Why: 配送中（PICKED/OUT_FOR_DELIVERY）→ ON THE WAY；已送达（DELIVERED*/COMPLETED）→ ARRIVED；其余不显标签
export function getRiderStatusTag(status: OrderStatus): RiderStatusTag | null {
  if (status === 'PICKED' || status === 'OUT_FOR_DELIVERY') return 'ON_THE_WAY';
  if (status === 'DELIVERED_PAID' || status === 'DELIVERED_UNPAID' || status === 'DELIVERED' || status === 'COMPLETED') {
    return 'ARRIVED';
  }
  return null;
}

// Why: 骑手评分星标金色（HTML star gold amber-500），semantic 无对应角色，已豁免
const STAR_COLOR = '#f59e0b';
// 原因：callBtn 红底白字 dark 不变（colors.primary callBtn），与 STAR_COLOR 同模式抽 const
const ON_PRIMARY = '#ffffff';

export function RiderCard({ rider, orderStatus }: { rider: RiderInfo; orderStatus: OrderStatus }) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const statusTag = getRiderStatusTag(orderStatus);
  // Why: 后端 rider select 不含 vehiclePlate（order.service.ts:1046-1053），只显 vehicleType
  const vehicle = rider.vehicleType;
  // Why: rating 后端返 string（Decimal normalize 去 0），转换层 Number 后用 Intl.NumberFormat locale 感知格式化（非 toFixed 硬拼）
  const ratingText =
    rider.rating != null
      ? new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rider.rating)
      : '--';
  // Why: ON_THE_WAY 用 primary-container 配色族，ARRIVED 用 surface-variant（与 banner 配色协调）
  const tagColors =
    statusTag === 'ON_THE_WAY'
      ? { bg: colors['primary-container'], text: colors['on-primary-container'], border: colors['outline-variant'] }
      : { bg: colors['surface-variant'], text: colors['on-surface-variant'], border: colors['outline-variant'] };
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors['primary-container'] }]}>
        {rider.avatar ? (
          <SafeImage source={{ uri: rider.avatar }} style={styles.avatarImg} />
        ) : (
          <Icon symbol="person" size={28} color={colors['on-primary']} />
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.bodyMdBold, { color: colors['on-surface'], flex: 1 }]} numberOfLines={1}>
            {rider.name ?? t('order.riderDefault', { defaultValue: 'Delivery Rider' })}
          </Text>
          {statusTag ? (
            <View style={[styles.statusTag, { backgroundColor: tagColors.bg, borderColor: tagColors.border }]}>
              <Text style={[styles.statusTagText, { color: tagColors.text }]}>
                {statusTag === 'ON_THE_WAY'
                  ? t('order.riderOnTheWay', { defaultValue: 'ON THE WAY' })
                  : t('order.riderArrived', { defaultValue: 'DELIVERED' })}
              </Text>
            </View>
          ) : null}
        </View>
        {vehicle ? (
          <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]} numberOfLines={1}>
            {vehicle}
          </Text>
        ) : null}
        <View style={styles.ratingRow}>
          <Icon symbol="star" size={12} color={STAR_COLOR} />
          <Text style={[styles.ratingText, { color: colors['on-surface-variant'] }]}>
            {ratingText}
            {rider.totalDeliveries != null
              ? ` · ${t('order.riderDeliveries', { count: rider.totalDeliveries, defaultValue: '{{count}} deliveries' })}`
              : ''}
          </Text>
        </View>
      </View>
      {rider.phone ? (
        <Pressable
          onPress={() => Linking.openURL(`tel:${rider.phone!.replace(/\s/g, '')}`)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.callBtn,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.92 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('order.callRider', {
            name: rider.name ?? '',
            defaultValue: 'Call rider {{name}}',
          })}
        >
          <Icon symbol="call" size={20} color={ON_PRIMARY} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusTag: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusTagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 12 },
  callBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bodyMdBold: { fontSize: 14, fontWeight: '700' },
  bodySm: { fontSize: 12 },
});
