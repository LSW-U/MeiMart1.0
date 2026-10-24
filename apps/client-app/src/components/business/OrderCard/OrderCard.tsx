import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, textStyle, spacing, borderRadius, shadowPresets } from '@/theme';
import { useLocalizer } from '@/i18n';
import { PriceText } from '@/components/ui/PriceText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { ORDER_STATUS_VISUAL, getStatusPill, getOrderActions } from '@/lib/orderStatusConfig';
import type { OrderCardProps, OrderAction } from './OrderCard.types';

function OrderCardBase({
  order,
  onPress,
  onAction,
  selectMode,
  isSelected,
  selectDisabled,
  testID,
}: OrderCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const localize = useLocalizer();
  const visual = ORDER_STATUS_VISUAL[order.status];
  const pill = getStatusPill(order.status, colors);
  // Why: labelKey i18n 驱动（批B）——状态/动作文案 4 语在 locales/*.json 维护，配置不再内置 {zh,en}
  const statusLabel = t(visual.labelKey);
  const thumbnails = order.items.slice(0, 2);
  const overflow = Math.max(0, order.items.length - 2);

  const actions = getOrderActions(order.status);

  return (
    <View
      testID={testID}
      accessibilityState={selectMode ? { selected: Boolean(isSelected) } : undefined}
      style={[
        styles.card,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderColor: colors['outline-variant'],
        },
        // 批3：管理模式选中态 2px primary 边（通知/收藏同形态）
        selectMode && isSelected && { borderWidth: 2, borderColor: colors.primary },
        shadowPresets.sm,
      ]}
    >
      {/* 批3：选择圆圈（纯状态非独立按钮，勾选走整卡 onPress；NotificationItem 同形态）
          Web 409 修复：selectDisabled（非终态）圆圈置灰不显勾，提示不可删 */}
      {selectMode && (
        <View
          style={[
            styles.selectCircle,
            { alignSelf: 'flex-end', marginRight: spacing.md, marginTop: spacing.sm },
          ]}
        >
          <View
            style={[
              styles.selectCircleInner,
              {
                backgroundColor: selectDisabled
                  ? colors['surface-container']
                  : isSelected
                    ? colors.primary
                    : colors['surface-container-lowest'],
                borderColor: selectDisabled
                  ? colors['outline-variant']
                  : isSelected
                    ? colors.primary
                    : colors['outline-variant'],
              },
            ]}
          >
            {isSelected && !selectDisabled && (
              <Icon symbol="check" size={13} color={colors['on-primary']} />
            )}
          </View>
        </View>
      )}
      {/* Why: 外层用 View 而非 Pressable，避免 Pressable 嵌套 Pressable/Button
          （RN Web 渲染为 <button> 嵌套 <button>，违反 HTML 规范导致 hydration 错误） */}
      <View style={[styles.header, { borderBottomColor: colors['outline-variant'] }]}>
        <Pressable
          onPress={onPress ? () => onPress(order) : undefined}
          style={({ pressed }) => [styles.headerLeft, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('order.cardHeaderA11y', {
            orderNo: order.orderNo,
            status: statusLabel,
            defaultValue: 'Order {{orderNo}}, status {{status}}',
          })}
          disabled={!onPress}
        >
          <Text style={[textStyle('label-caps'), { color: colors.primary, fontSize: 12 }]}>
            #{order.orderNo}
          </Text>
          <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
            {order.createdAt}
          </Text>
        </Pressable>
        <View style={styles.headerRight}>
          <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: pill.dot }]} />
            <Text style={[textStyle('label-caps-sm'), { color: pill.fg }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <Pressable
          onPress={onPress ? () => onPress(order) : undefined}
          style={({ pressed }) => [styles.thumbRowWrap, pressed && styles.pressed]}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={
            onPress
              ? t('order.viewOrderA11y', {
                  orderNo: order.orderNo,
                  defaultValue: 'View order {{orderNo}} details',
                })
              : undefined
          }
          disabled={!onPress}
        >
          <View style={styles.thumbRow}>
            {thumbnails.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.thumb,
                  {
                    backgroundColor: colors['surface-container'],
                    borderColor: colors['outline-variant'],
                  },
                ]}
              >
                <SafeImage
                  source={{ uri: item.product.image }}
                  style={styles.thumbImg}
                  variant="thumb"
                  lazy
                  recyclingKey={item.id}
                  accessible={false}
                  accessibilityLabel={localize(item.product.name)}
                />
              </View>
            ))}
            {overflow > 0 && (
              <View
                style={[
                  styles.thumb,
                  {
                    backgroundColor: colors['surface-container'],
                    borderColor: colors['outline-variant'],
                  },
                ]}
              >
                <Text
                  style={[
                    textStyle('label-caps'),
                    { color: colors['on-surface-variant'], fontSize: 10 },
                  ]}
                >
                  {/* B-P2-5: overflow 计数走 t()（复用 order.itemsCount「商品（共 N 件）」同源 count 插值） */}
                  {t('order.overflowItems', { count: overflow })}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        <View style={styles.footer}>
          <View style={styles.totalBox}>
            <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
              {t('order.total')}
            </Text>
            <PriceText value={order.totalPrice} size="md" />
          </View>
          {actions.length > 0 && onAction && (
            <View style={styles.actions}>
              {actions.map(({ labelKey, action, primary }) => (
                <Button
                  key={action}
                  label={t(labelKey)}
                  variant={primary ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => onAction(action as OrderAction, order)}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export const OrderCard = memo(OrderCardBase);

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    gap: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  body: {
    padding: spacing.md,
    gap: spacing.md,
  },
  thumbRowWrap: {
    flexDirection: 'row',
  },
  thumbRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  totalBox: {
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // 批3：管理模式选择圆圈外层占位（对齐通知页 22² 规格）
  selectCircle: {},
  selectCircleInner: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
