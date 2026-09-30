// 订单详情页 Header（红底 tais-pattern + 返回/帮助/分享）（批5 拆分：原样搬移，行为零变更）
import { View, Text, Pressable, Platform, Share, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, shadowPresets } from '@/theme';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/store/toastStore';
import { ON_PRIMARY } from '../shared';

export function Header({ title, orderNo }: { title: string; orderNo?: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const handleBack = useSafeBack();
  return (
    <View style={[styles.header, { backgroundColor: colors.primary }, shadowPresets.umaLulik]}>
      <View style={styles.headerPattern} pointerEvents="none">
        <TaisPattern width={390} height={64} opacity={0.2} />
      </View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
        >
          <Icon symbol="arrow_back" size={24} color={ON_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/service/help')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.help', { defaultValue: 'Help' })}
          >
            <Icon symbol="help_outline" size={22} color={ON_PRIMARY} />
          </Pressable>
          <Pressable
            onPress={() => {
              const message = t('order.shareMessage', {
                orderNo: orderNo ?? '',
                defaultValue: 'MeiMart order {{orderNo}}',
              });
              if (Platform.OS === 'web') {
                // Why: Web 端 Share API 兼容性差，用 clipboard 兜底 + toast 反馈
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(message).catch(() => {});
                  toast.success(t('order.shareCopied', { defaultValue: 'Order link copied' }));
                }
              } else {
                Share.share({ message }).catch(() => {
                  // 用户取消分享，静默
                });
              }
            }}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('order.shareA11y', {
              orderNo: orderNo ?? '',
              defaultValue: 'Share order {{orderNo}}',
            })}
          >
            <Icon symbol="share" size={22} color={ON_PRIMARY} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    // V16：对齐原型 56px（原 64）
    height: 56,
    overflow: 'hidden',
    paddingHorizontal: layout['container-margin'],
    justifyContent: 'center',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: ON_PRIMARY,
    fontSize: 22,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
