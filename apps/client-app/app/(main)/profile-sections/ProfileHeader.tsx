// Primary tais-pattern Header（HTML 第 142-144 行：h-14 顶栏 + h-48 tais-pattern 底色）
// 已迁移到 PrimaryHeader 组件（CP-FIX P1-3），PrimaryHeader 内置 TaisPattern absolute 叠层（§3.5）
// 批5 拆分：从 app/(main)/profile.tsx 原样搬移，行为零变更
import { StyleSheet, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, shadowPresets } from '@/theme';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { useUnreadCount } from '@/services/queries/useNotifications';
import { ON_PRIMARY } from './shared';

export function ProfileHeader() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // 批B B3：通知入口接真实未读数（现状无角标）；未登录 hook 内部不请求 → 不显示
  const { data: unreadCount } = useUnreadCount();
  return (
    <View style={{ backgroundColor: colors.primary, ...shadowPresets.md }}>
      <PrimaryHeader
        title={t('profile.title')}
        rightActions={
          <View style={profileHeaderStyles.actions}>
            <Pressable
              onPress={() => router.push('/service')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('profile.customerService')}
            >
              <Icon symbol="headset" size={24} color={ON_PRIMARY} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/service/notifications')}
              hitSlop={8}
              style={profileHeaderStyles.notifBtn}
              accessibilityRole="button"
              accessibilityLabel={t('profile.notifications')}
              testID="profile-notifications"
            >
              <Icon symbol="notifications" size={24} color={ON_PRIMARY} />
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
