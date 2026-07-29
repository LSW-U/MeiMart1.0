import { ScrollView, Pressable, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { Modal } from '@/components/ui/Modal/Modal';
import { Icon } from '@/components/ui/Icon';
import { formatCouponValue } from '@/utils/coupon';
import type { CouponPickerProps } from './CouponPicker.types';

// Why: 选券 Modal —— checkout 选券用，未来 cart Coupons(N) 入口也可复用（折扣 UI 统一方案 §4.1）
//      ⚠️ 无 HTML 原型（CheckoutPage.html 无券 UI），参考 coupons.tsx 卡片风格推导，待设计确认
export function CouponPicker({
  visible,
  onClose,
  coupons,
  selectedCode,
  onSelect,
  testID,
}: CouponPickerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} onClose={onClose} title={t('checkout.coupon.title')} testID={testID}>
      <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.sm }}>
        {/* 不使用券 */}
        <Pressable
          onPress={() => {
            onSelect(undefined);
            onClose();
          }}
          style={[
            styles.item,
            {
              backgroundColor: colors['surface-container-low'],
              borderColor: !selectedCode ? colors.primary : colors['outline-variant'],
              borderWidth: !selectedCode ? 2 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('checkout.coupon.none')}
        >
          <View style={styles.itemText}>
            <Text style={[styles.itemName, { color: colors['on-surface'] }]}>
              {t('checkout.coupon.none')}
            </Text>
          </View>
          {!selectedCode && <Icon symbol="check_circle" size={20} color={colors.primary} />}
        </Pressable>
        {/* 券列表 */}
        {coupons.map((coupon) => {
          const active = selectedCode === coupon.code;
          return (
            <Pressable
              key={coupon.id}
              onPress={() => {
                onSelect(coupon.code);
                onClose();
              }}
              style={[
                styles.item,
                {
                  backgroundColor: colors['surface-container-low'],
                  borderColor: active ? colors.primary : colors['outline-variant'],
                  borderWidth: active ? 2 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${coupon.name} ${coupon.code}`}
            >
              <View style={styles.itemText}>
                <Text style={[styles.itemName, { color: colors['on-surface'] }]} numberOfLines={1}>
                  {coupon.name}
                </Text>
                <Text style={[styles.itemMeta, { color: colors['on-surface-variant'] }]}>
                  {coupon.code} · {formatCouponValue(coupon, t)}
                </Text>
                <Text style={[styles.itemMeta, { color: colors['on-surface-variant'] }]}>
                  {t('checkout.coupon.minOrder', { amount: coupon.minOrderAmount })}
                </Text>
              </View>
              {active && <Icon symbol="check_circle" size={20} color={colors.primary} />}
            </Pressable>
          );
        })}
        {coupons.length === 0 && (
          <Text style={[styles.empty, { color: colors['on-surface-variant'] }]}>
            {t('checkout.coupon.empty')}
          </Text>
        )}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 420 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  itemText: { flex: 1, gap: 2 },
  itemName: { ...typography['body-md'], fontWeight: '600' },
  itemMeta: { ...typography['body-sm'] },
  empty: { ...typography['body-md'], textAlign: 'center', paddingVertical: spacing.lg },
});
