import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, textStyle, spacing, borderRadius, shadowPresets } from '@/theme';
import { useLocalizer, getCurrentLocale } from '@/i18n';
import { PriceText } from '@/components/ui/PriceText';
import { Button } from '@/components/ui/Button';
import { ORDER_STATUS_VISUAL, getOrderActions } from '@/lib/orderStatusConfig';
import type { OrderCardProps, OrderAction } from './OrderCard.types';

// Why: orderStatusConfig 的 label 是 {zh, en}，按当前 locale 取 string（tet fallback 到 en）
function pickLabel(label: { zh: string; en: string }): string {
  const locale = getCurrentLocale();
  const record = label as Record<string, string>;
  return record[locale] ?? label.en;
}

export function OrderCard({ order, onPress, onAction, testID }: OrderCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const localize = useLocalizer();
  const visual = ORDER_STATUS_VISUAL[order.status];
  const pill = visual.pill;
  const statusLabel = pickLabel(visual.label);
  const thumbnails = order.items.slice(0, 2);
  const overflow = Math.max(0, order.items.length - 2);

  const actions = getOrderActions(order.status);

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderColor: colors['outline-variant'],
        },
        shadowPresets.sm,
        pressed && styles.pressed,
      ]}
      onPress={onPress ? () => onPress(order) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNo}, status ${statusLabel}`}
    >
      <View style={[styles.header, { borderBottomColor: colors['outline-variant'] }]}>
        <View style={styles.headerLeft}>
          <Text style={[textStyle('label-caps'), { color: colors.primary, fontSize: 10 }]}>
            #{order.orderNo}
          </Text>
          <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
            {order.createdAt}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: pill.dot }]} />
            <Text style={[textStyle('label-caps'), { color: pill.fg, fontSize: 10 }]}>
              {statusLabel}
            </Text>
          </View>
          {onAction && (
            <Pressable
              onPress={() => onAction('cancel', order)}
              hitSlop={8}
              style={[styles.deleteBtn, { backgroundColor: colors['error-container'] }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
            >
              <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.body}>
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
              <Image
                source={{ uri: item.product.image }}
                style={styles.thumbImg}
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
                +{overflow} ITEM
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.totalBox}>
            <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
              {t('order.total')}
            </Text>
            <PriceText value={order.totalPrice} size="md" />
          </View>
          {actions.length > 0 && onAction && (
            <View style={styles.actions}>
              {actions.map(({ label, action, primary }) => (
                <Button
                  key={action}
                  label={pickLabel(label)}
                  variant={primary ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => onAction(action as OrderAction, order)}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

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
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.md,
    gap: spacing.md,
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
});
