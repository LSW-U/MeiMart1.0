// Primary tais-pattern Header（HTML 第 142-144 行：h-14 顶栏 + h-48 tais-pattern 底色）
// 已迁移到 PrimaryHeader 组件（CP-FIX P1-3），PrimaryHeader 内置 TaisPattern absolute 叠层（§3.5）
// 批5 拆分：从 app/(main)/profile.tsx 原样搬移，行为零变更
// 20261110 拍板：客服图标迁出（→ 账户与服务菜单 shared.ts FUNCTION_ITEMS），右上角换扫码
//   占位（选项 A：扫码能力全仓不存在且业务场景未定义，先占入口保留 toast 行为，待立项）
import { StyleSheet, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, shadowPresets } from '@/theme';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { useUnreadCount } from '@/services/queries/useNotifications';
import { toast } from '@/store/toastStore';
import { ON_PRIMARY } from './shared';

export function ProfileHeader() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // 批B B3：通知入口接真实未读数（现状无角标）；未登录 hook 内部不请求 → 不显示
  const { data: unreadCount } = useUnreadCount();
  // 20261110 拍板 A：扫码占位——与 Discover 占位同款 toast，能力立项后替换
  const onScanPress = () => {
    toast.info(t('profile.featureComingSoon', { defaultValue: 'Feature coming soon' }));
  };
  return (
    <View style={{ backgroundColor: colors.primary, ...shadowPresets.md }}>
      <PrimaryHeader
        title={t('profile.title')}
        rightActions={
          <View style={profileHeaderStyles.actions}>
            <Pressable
              onPress={onScanPress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('profile.scan')}
            >
              <Icon symbol="qr_code_scanner" size={24} color={ON_PRIMARY} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/service/notifications')}
              hitSlop={8}
              style={profileHeaderStyles.notifBtn}
              accessibilityRole="button"
              accessibilityLabel={t('profile.notifications')}
              testID="profile-notifications"
            >
              <Icon symbol="mail" size={24} color={ON_PRIMARY} />
              {(unreadCount ?? 0) > 0 && (
                // P2-1 修复（方案a）：底色传语义 error 红——Badge label 恒 colors['on-primary']
                // （light 白字需红底才可读，原 ON_PRIMARY 白底在 light 下白字白底不可见）
                <Badge
                  count={unreadCount ?? 0}
                  variant="number"
                  color={colors.semantic.error}
                  accessibilityLabel={t('profile.unreadBadge', { count: unreadCount ?? 0 })}
                  style={profileHeaderStyles.notifBadge}
                />
              )}
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const profileHeaderStyles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // 批B B3：badge absolute 参考系（同 home msgBtn relative 惯例）
  notifBtn: {
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
  },
});
