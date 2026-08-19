import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, textStyle, spacing, borderRadius, shadowPresets } from '@/theme';
import { getRelativeTimeUnit, formatPrice } from '@/utils/format';
import { openExternalLink } from '@/utils/linking';
import { toIconName, type IconName } from '@/types';
import type { NotificationItemProps } from './NotificationItem.types';

// Why: P23 D4/D5 —— 按 data 场景字段选超市场景图标（比 type 级泛化图标更具体）
type SceneIcon = { name: IconName; bgKey: 'order' | 'promo' | 'system' };

function sceneIcon(n: { type: string; data?: Record<string, unknown> | null }): SceneIcon {
  if (n.type === 'order') {
    if (typeof n.data?.progress === 'number') return { name: 'truck', bgKey: 'order' };
    if (n.data?.deadline) return { name: 'cash', bgKey: 'order' };
    if (n.data?.replacementItem) return { name: 'swap-horizontal', bgKey: 'order' };
    return { name: 'package-variant-closed', bgKey: 'order' };
  }
  if (n.type === 'promotion') {
    if (n.data?.endsAt) return { name: 'flash', bgKey: 'promo' };
    if (n.data?.productId) return { name: 'bell-badge', bgKey: 'promo' };
    if (n.data?.shortfall !== undefined) return { name: 'cart', bgKey: 'promo' };
    return { name: 'ticket-percent', bgKey: 'promo' };
  }
  return { name: 'cog', bgKey: 'system' };
}

/** 相对时间（P23 D6 推荐①）：复用 getRelativeTimeUnit + common.relTime.*（与评论卡同口径） */
function useRelTime(iso: string): string {
  const { t } = useTranslation();
  const { unit, count } = getRelativeTimeUnit(iso);
  return t(`common.relTime.${unit}`, { count });
}

/** 秒级倒计时（P23 Q3）：endsAt ISO → HH:MM:SS 段；到 0 显示 ended */
function useCountdown(endsAt?: unknown, label?: string) {
  const [left, setLeft] = useState(() =>
    endsAt ? Math.max(0, Math.floor((new Date(String(endsAt)).getTime() - Date.now()) / 1000)) : 0,
  );
  useEffect(() => {
    if (!endsAt) return;
    const timer = setInterval(() => {
      setLeft(Math.max(0, Math.floor((new Date(String(endsAt)).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);
  if (!endsAt) return null;
  if (left <= 0) return { ended: true as const, label: label ?? '' };
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return {
    ended: false as const,
    parts: [h, m, s].map((v) => String(v).padStart(2, '0')),
  };
}

export function NotificationItem({ notification, onPress, onCta, testID }: NotificationItemProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const relTime = useRelTime(notification.createdAt);
  const read = notification.read;
  const data = notification.data;
  const icon = sceneIcon(notification);

  // 场景字段收窄（data 是 unknown record）
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);
  const orderId = str(data?.orderId);
  const riderName = str(data?.riderName);
  const riderPhone = str(data?.riderPhone);
  const eta = str(data?.eta);
  const progress = num(data?.progress);
  const deadline = str(data?.deadline);
  const endsAt = str(data?.endsAt);
  const productId = str(data?.productId);
  const productName = str(data?.productName);
  const salePrice = num(data?.salePrice);
  const originalPrice = num(data?.originalPrice);
  const cartAmount = num(data?.cartAmount);
  const threshold = num(data?.threshold);
  const countdown = useCountdown(endsAt ?? deadline, t('service.notifications.ended'));

  // 图标底/色按类型（原型 .notif.order/.promo/.system .ico）
  const iconBg =
    icon.bgKey === 'order'
      ? colors['surface-container']
      : icon.bgKey === 'promo'
        ? colors.semantic['positive-container']
        : colors.semantic['info-container'];
  const iconColor =
    icon.bgKey === 'order'
      ? colors.primary
      : icon.bgKey === 'promo'
        ? colors.semantic.positive
        : colors.semantic.info;

  const cta = (action: string) => onCta?.(action, notification);
  const callRider = () => {
    if (riderPhone) openExternalLink(`tel:${riderPhone}`, t('errors.openLinkFailed'));
  };

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors['surface-container-lowest'] },
        shadowPresets.sm,
        // Why: P23 D2 —— 已读：1px 微边框；未读：左 4px primary 色条（§9.1 borderLeft 方案）+ 同款微边框。
        //      边框色运行时注入（styles 静态段不能引 colors）
        read
          ? { borderWidth: 1, borderColor: colors['outline-variant'] }
          : {
              borderTopWidth: 1,
              borderRightWidth: 1,
              borderBottomWidth: 1,
              borderLeftWidth: 4,
              borderTopColor: colors['outline-variant'],
              borderRightColor: colors['outline-variant'],
              borderBottomColor: colors['outline-variant'],
              borderLeftColor: colors.primary,
            },
        pressed && styles.pressed,
      ]}
      onPress={onPress ? () => onPress(notification) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}, ${relTime}`}
    >
      {/* Why: P23 D2 —— 未读左色条用 borderLeft 实现（§9.1 推荐方案，无层级问题） */}
      <View style={[styles.iconBox, { backgroundColor: iconBg, borderRadius: borderRadius.md }]}>
        <MaterialCommunityIcons name={toIconName(icon.name)} size={22} color={iconColor} />
      </View>
      <View style={styles.main}>
        <View style={styles.topRow}>
          <Text
            style={[
              textStyle('body-md'),
              { flex: 1 },
              read
                ? { fontWeight: '500', color: colors['on-surface-variant'] }
                : { fontWeight: '800', color: colors['on-surface'] },
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          {!read && <View style={[styles.dot, { backgroundColor: colors.error }]} />}
        </View>
        <Text
          style={[
            textStyle('body-sm'),
            { color: colors['on-surface-variant'] },
            read && { opacity: 0.6 },
          ]}
          numberOfLines={2}
        >
          {notification.body}
        </Text>

        {/* —— 配送进度条（D4：progress 0-3）—— */}
        {typeof progress === 'number' && (
          <ProgressSteps progress={progress} />
        )}

        {/* —— 骑手信息行（D4：riderName/riderPhone/eta）—— */}
        {(riderName || eta) && (
          <View
            style={[
              styles.deliveryRow,
              { backgroundColor: colors['surface-container'] },
            ]}
          >
            {riderName && (
              <View style={[styles.riderAvatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.riderAvatarText, { color: colors['on-primary'] }]}>
                  {riderName.slice(0, 1)}
                </Text>
              </View>
            )}
            <View style={styles.riderInfo}>
              {riderName && (
                <Text style={[styles.riderName, { color: colors['on-surface'] }]}>
                  {t('service.notifications.rider')} {riderName}
                </Text>
              )}
              {eta && (
                <Text style={[styles.riderEta, { color: colors['on-surface-variant'] }]}>
                  {t('service.notifications.eta', { time: eta })}
                </Text>
              )}
            </View>
            {riderPhone && (
              <Pressable
                onPress={callRider}
                style={[
                  styles.callBtn,
                  { backgroundColor: colors.semantic['positive-container'] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('service.notifications.cta.callRider', { defaultValue: 'Call' })}
              >
                <MaterialCommunityIcons name="phone" size={16} color={colors.semantic.positive} />
              </Pressable>
            )}
          </View>
        )}

        {/* —— 倒计时（D4 待付款 deadline / D5 秒杀 endsAt）—— */}
        {countdown && !countdown.ended && (
          <View style={styles.countdownRow}>
            <Text
              style={[
                styles.countdownLabel,
                deadline
                  ? { color: colors.error }
                  : { color: colors.semantic.warning },
              ]}
            >
              {t(deadline ? 'service.notifications.remaining' : 'service.notifications.endsIn')}
            </Text>
            <View style={styles.countdownBox}>
              {countdown.parts.map((part, i) => (
                <View
                  key={i}
                  style={[
                    styles.countNum,
                    {
                      backgroundColor: deadline ? colors.error : colors.semantic.warning,
                    },
                  ]}
                >
                  <Text style={[styles.countNumText, { color: colors['on-primary'] }]}>{part}</Text>
                </View>
              )).reduce<React.ReactNode[]>(
                (acc, el, i) => (i === 0 ? [el] : [...acc, <CountSep key={`s${i}`} deadline={!!deadline} />, el]),
                [],
              )}
            </View>
          </View>
        )}
        {countdown?.ended && (
          <Text style={[styles.endedText, { color: colors['on-surface-variant'] }]}>
            {countdown.label}
          </Text>
        )}

        {/* —— 商品缩略行（D5 秒杀/到货）—— */}
        {(productId || productName) && (
          <View
            style={[styles.prodRow, { backgroundColor: colors['surface-container'] }]}
          >
            <View style={[styles.prodThumb, { backgroundColor: colors['surface-container-high'] }]}>
              <MaterialCommunityIcons
                name="leaf"
                size={20}
                color={colors['outline-variant']}
              />
            </View>
            <View style={styles.prodInfo}>
              {productName && (
                <Text style={[styles.prodName, { color: colors['on-surface'] }]} numberOfLines={1}>
                  {productName}
                </Text>
              )}
              {typeof salePrice === 'number' && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceNow, { color: colors.error }]}>
                    {formatPrice(salePrice)}
                  </Text>
                  {typeof originalPrice === 'number' && (
                    <Text
                      style={[
                        styles.priceOld,
                        { color: colors['on-surface-variant'] },
                      ]}
                    >
                      {formatPrice(originalPrice)}
                    </Text>
                  )}
                  {typeof originalPrice === 'number' && salePrice > 0 && (
                    <View
                      style={[
                        styles.discountTag,
                        { backgroundColor: colors.semantic['error-container'] },
                      ]}
                    >
                      <Text style={[styles.discountText, { color: colors.error }]}>
                        -{Math.round((1 - salePrice / originalPrice) * 100)}%
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* —— 满减凑单进度（D5：cartAmount/threshold）—— */}
        {typeof cartAmount === 'number' && typeof threshold === 'number' && threshold > 0 && (
          <View
            style={[
              styles.fulfillRow,
              { backgroundColor: colors.semantic['warning-container'] },
            ]}
          >
            <View style={styles.fulfillBar}>
              <View
                style={[
                  styles.fulfillFill,
                  {
                    width: `${Math.min(100, Math.round((cartAmount / threshold) * 100))}%`,
                    backgroundColor: colors.semantic.warning,
                  },
                ]}
              />
            </View>
            <Text style={[styles.fulfillText, { color: colors.semantic.warning }]}>
              {cartAmount}/{threshold}
            </Text>
          </View>
        )}

        {/* —— meta 行：相对时间 + CTA —— */}
        <View style={styles.metaRow}>
          <Text style={[styles.timeText, { color: colors['on-surface-variant'] }]}>{relTime}</Text>
          <CtaLinks notification={notification} onCta={cta} orderId={orderId} />
        </View>
      </View>
    </Pressable>
  );
}

/** 倒计时分隔符（: ） */
function CountSep({ deadline }: { deadline: boolean }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.countSep, { color: deadline ? colors.error : colors.semantic.warning }]}>
      :
    </Text>
  );
}

/** 配送 4 步进度条（原型 .progress：已下单→已拣货→配送中→已送达） */
function ProgressSteps({ progress }: { progress: number }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const steps = [
    { label: t('service.notifications.step.ordered'), icon: 'check' as const },
    { label: t('service.notifications.step.picked'), icon: 'check' as const },
    { label: t('service.notifications.step.delivering'), icon: 'truck-delivery' as const },
    { label: t('service.notifications.step.delivered'), icon: 'home' as const },
  ];
  return (
    <View style={styles.progressRow}>
      {steps.map((step, i) => {
        const state = i < progress ? 'done' : i === progress ? 'cur' : 'todo';
        return (
          <View key={i} style={styles.pstep}>
            <View style={styles.pdotLineWrap}>
              <View
                style={[
                  styles.pdot,
                  state === 'done' && { backgroundColor: colors.semantic.positive },
                  state === 'cur' && { backgroundColor: colors.primary },
                  state === 'todo' && { backgroundColor: colors['surface-container'] },
                ]}
              >
                <MaterialCommunityIcons
                  name={toIconName(step.icon)}
                  size={12}
                  color={state === 'todo' ? colors['outline-variant'] : colors['on-primary']}
                />
              </View>
              {i < steps.length - 1 && (
                <View
                  style={[
                    styles.pline,
                    {
                      backgroundColor:
                        i < progress ? colors.semantic.positive : colors['surface-container'],
                    },
                  ]}
                />
              )}
            </View>
            <Text
              style={[
                styles.plabel,
                { color: state === 'cur' ? colors.primary : colors['on-surface-variant'] },
              ]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** meta 行 CTA 链接（按场景给 1 个主 CTA） */
function CtaLinks({
  notification,
  onCta,
  orderId,
}: {
  notification: NotificationItemProps['notification'];
  onCta: (action: string) => void;
  orderId?: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const data = notification.data;
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

  // 场景 → 主 CTA
  let action: string | null = null;
  let label: string | null = null;
  if (notification.type === 'order') {
    if (typeof data?.progress === 'number') {
      action = 'viewTracking';
      label = t('service.notifications.cta.viewTracking');
    } else if (str(data?.deadline)) {
      action = 'payNow';
      label = t('service.notifications.cta.payNow');
    } else if (str(data?.replacementItem)) {
      action = 'viewDetails';
      label = t('service.notifications.cta.viewDetails');
    } else if (orderId) {
      action = 'writeReview';
      label = t('service.notifications.cta.writeReview');
    }
  } else if (notification.type === 'promotion') {
    if (str(data?.endsAt)) {
      action = 'shopNow';
      label = t('service.notifications.cta.shopNow');
    } else if (str(data?.productId)) {
      action = 'buyNow';
      label = t('service.notifications.cta.buyNow');
    } else if (data?.shortfall !== undefined) {
      action = 'addMore';
      label = t('service.notifications.cta.addMore');
    } else if (str(data?.couponId)) {
      action = 'useCoupon';
      label = t('service.notifications.cta.useCoupon');
    }
  }
  if (!action || !label) return null;
  return (
    <Pressable
      onPress={() => onCta(action)}
      style={styles.ctaRow}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.ctaText, { color: colors.primary }]}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={14} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md - 2,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  iconBox: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 7, height: 7, borderRadius: 999 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  timeText: { fontSize: 11, opacity: 0.8 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctaText: { fontSize: 11, fontWeight: '600' },
  // 配送进度条
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  pstep: { flex: 1, alignItems: 'center', gap: 3 },
  pdotLineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    alignSelf: 'stretch',
  },
  pdot: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pline: { flex: 1, height: 2 },
  plabel: { fontSize: 9, fontWeight: '600' },
  // 骑手行
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  riderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderAvatarText: { fontSize: 11, fontWeight: '700' },
  riderInfo: { flex: 1, gap: 1 },
  riderName: { fontSize: 12, fontWeight: '600' },
  riderEta: { fontSize: 10 },
  callBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 倒计时
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  countdownLabel: { fontSize: 10, fontWeight: '600' },
  countdownBox: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  countNum: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNumText: { fontSize: 11, fontWeight: '800' },
  countSep: { fontSize: 11, fontWeight: '800' },
  endedText: { fontSize: 11, marginTop: 6 },
  // 商品行
  prodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
    padding: 6,
    borderRadius: borderRadius.md,
  },
  prodThumb: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodInfo: { flex: 1, gap: 1 },
  prodName: { fontSize: 12, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  priceNow: { fontSize: 14, fontWeight: '800' },
  priceOld: { fontSize: 11, textDecorationLine: 'line-through' },
  discountTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: { fontSize: 9, fontWeight: '700' },
  // 满减
  fulfillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  fulfillBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(245,124,0,0.2)', // 原型 .fbar 底（warning 20% tint）
  },
  fulfillFill: { height: '100%', borderRadius: 3 },
  fulfillText: { fontSize: 11, fontWeight: '600' },
});
