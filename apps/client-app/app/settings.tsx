// ⚠️ 无 HTML 原型，参考 ProfilePage 推导实现，待设计确认
// SettingsPage — 设置页（参考 ProfilePage.html 的分组列表样式）
// D.13: PrimaryHeader + 分组设置项（外观/通用/隐私/关于）+ 退出登录
import { StyleSheet, View, Text, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { APP_VERSION } from '@/utils/appInfo';
import type { ReactNode } from 'react';

export default function SettingsPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const locale = useAppStore((s) => s.locale);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  // P17 决策 5 —— 登录态自适应：未登录不显示「退出登录」（语义错误），显示登录/注册入口
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const setMode = (mode: 'light' | 'dark' | 'system') => setThemeMode(mode);

  const clearCache = () => toast.success(t('settings.clearCacheDone'));
  const logout = () => {
    // Why: Web 端 Alert 不显示，直接退出 + toast；Native 端用 Alert 确认
    if (Platform.OS === 'web') {
      clearAuth();
      router.replace('/(auth)/login');
      toast.success(t('profile.logout'));
      return;
    }
    Alert.alert(t('settings.logoutTitle'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: () => {
          clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBarConfig />
      <PrimaryHeader title={t('settings.title')} showBack onBackPress={handleBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 账号与服务（P17 决策 1） */}
        <SectionTitle title={t('settings.accountSection')} color={colors['on-surface-variant']} />
        <View
          style={[
            styles.groupCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <PressableRow
            label={t('settings.profileInfo')}
            icon="person"
            iconBg={colors.primary}
            iconFg={colors['on-primary']}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-profile"
            onPress={() => router.push('/profile/edit')}
          />
          <PressableRow
            label={t('settings.shippingAddress')}
            icon="location_on"
            iconBg={colors.primary}
            iconFg={colors['on-primary']}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-address"
            onPress={() => router.push('/address/list')}
          />
          <PressableRow
            label={t('settings.customerService')}
            icon="headset_mic"
            iconBg={colors.primary}
            iconFg={colors['on-primary']}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-service"
            onPress={() => router.push('/service')}
          />
          <PressableRow
            label={t('settings.feedback')}
            icon="rate_review"
            iconBg={colors.primary}
            iconFg={colors['on-primary']}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            showDivider={false}
            testID="settings-feedback"
            onPress={() => router.push('/service/feedback')}
          />
        </View>

        {/* 偏好（P17 决策 1：主题/语言/通知偏好） */}
        <SectionTitle
          title={t('settings.preferencesSection')}
          color={colors['on-surface-variant']}
        />
        <View
          style={[
            styles.groupCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <RowItem
            label={t('settings.theme')}
            icon="palette"
            iconBg={colors.primary}
            iconFg={colors['on-primary']}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-theme"
          >
            <SegmentSwitch
              value={themeMode}
              onChange={setMode}
              color={colors.primary}
              activeTextColor={colors['on-primary']}
              subColor={colors['on-surface-variant']}
              activeColor={colors['surface-container-low']}
            />
          </RowItem>
          <PressableRow
            label={t('settings.language')}
            icon="language"
            iconBg={colors.primary}
            iconFg={colors['on-primary']}
            value={locale === 'zh' ? '中文' : locale === 'en' ? 'English' : locale.toUpperCase()}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-language"
            onPress={() => router.push('/language')}
          />
          <PressableRow
            label={t('settings.notificationPrefs')}
            icon="notifications"
            iconBg={colors.primary}
            iconFg={colors['on-primary']}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            showDivider={false}
            testID="settings-notifications"
            onPress={() => router.push('/service/notifications')}
          />
        </View>

        {/* 存储（P17 决策 1/3：清除缓存真实数据 Commit 5 接） */}
        <SectionTitle title={t('settings.storageSection')} color={colors['on-surface-variant']} />
        <View
          style={[
            styles.groupCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <PressableRow
            label={t('settings.clearCache')}
            icon="delete"
            iconBg={colors.primary}
            iconFg={colors['on-primary']}
            value="1.2 MB"
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            showDivider={false}
            testID="settings-cache"
            onPress={clearCache}
          />
        </View>

        {/* 隐私与条款（P17 决策 4：Commit 6 接 LegalPage） */}
        <SectionTitle title={t('settings.legalSection')} color={colors['on-surface-variant']} />
        <View
          style={[
            styles.groupCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <PressableRow
            label={t('settings.privacyPolicy', { defaultValue: 'Privacy Policy' })}
            icon="security"
            iconBg={colors.primary}
            iconFg={colors['on-primary']}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-privacy"
            onPress={() => {}}
          />
          <PressableRow
            label={t('settings.terms')}
            icon="auto_stories"
            iconBg={colors.primary}
            iconFg={colors['on-primary']}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            showDivider={false}
            testID="settings-tos"
            onPress={() => {}}
          />
        </View>

        {/* 关于 */}
        <SectionTitle title={t('settings.aboutSection')} color={colors['on-surface-variant']} />
        <View
          style={[
            styles.groupCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          {/* P17 决策 2：版本是信息不是操作，RowItem 无 chevron（无检查更新接口前不做假入口） */}
          <RowItem
            label={t('settings.version')}
            icon="info"
            iconBg={colors.primary}
            iconFg={colors['on-primary']}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-version"
          >
            <Text style={[styles.value, { color: colors['on-surface-variant'] }]}>v{APP_VERSION}</Text>
          </RowItem>
          <PressableRow
            label={t('settings.about')}
            icon="info"
            iconBg={colors.primary}
            iconFg={colors['on-primary']}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            showDivider={false}
            testID="settings-about"
            onPress={() => router.push('/about')}
          />
        </View>

        {isAuthenticated ? (
          /* 退出登录（带 TaisPattern 装饰） */
          <Pressable
            testID="settings-logout"
            onPress={logout}
            style={({ pressed }) => [
              styles.logout,
              { backgroundColor: colors['surface-container-lowest'] },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('profile.logout')}
          >
            <View style={styles.logoutPattern} pointerEvents="none">
              <TaisPattern width={400} height={60} opacity={0.15} />
            </View>
            <Icon symbol="logout" size={18} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>{t('profile.logout')}</Text>
          </Pressable>
        ) : (
          // P17 决策 5 —— 未登录：登录/注册入口（复用 profile 页文案与样式语义）
          <Pressable
            testID="settings-login"
            onPress={() => router.replace('/(auth)/login')}
            style={({ pressed }) => [
              styles.loginCard,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('profile.loginOrRegister')}
          >
            <Icon symbol="login" size={18} color={colors['on-primary']} />
            <Text style={[styles.loginText, { color: colors['on-primary'] }]}>
              {t('profile.loginRegister')}
            </Text>
          </Pressable>
        )}

        <Text style={[styles.footerText, { color: colors['on-surface-variant'] }]}>
          MeiMart v{APP_VERSION} · © 2026 MeiMart Lda.
        </Text>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
    </View>
  );
}

function RowItem({
  label,
  icon,
  iconBg,
  iconFg,
  textColor,
  subColor,
  dividerColor,
  children,
  testID,
  showDivider = true,
}: {
  label: string;
  icon: string;
  iconBg: string;
  iconFg: string;
  textColor: string;
  subColor: string;
  dividerColor: string;
  children?: ReactNode;
  testID?: string;
  showDivider?: boolean;
}) {
  return (
    <View testID={testID} style={styles.row}>
      <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
        <Icon symbol={icon} size={18} color={iconFg} />
      </View>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <View style={styles.right}>{children}</View>
      {showDivider && <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />}
    </View>
  );
}

function PressableRow({
  label,
  icon,
  iconBg,
  iconFg,
  value,
  textColor,
  subColor,
  dividerColor,
  onPress,
  testID,
  showDivider = true,
}: {
  label: string;
  icon: string;
  iconBg: string;
  iconFg: string;
  value?: string;
  textColor: string;
  subColor: string;
  dividerColor: string;
  onPress?: () => void;
  testID?: string;
  showDivider?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
        <Icon symbol={icon} size={18} color={iconFg} />
      </View>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <View style={styles.right}>
        {value && <Text style={[styles.value, { color: subColor }]}>{value}</Text>}
        <Icon symbol="chevron_right" size={20} color={subColor} />
      </View>
      {showDivider && <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />}
    </Pressable>
  );
}

function SegmentSwitch({
  value,
  onChange,
  color,
  activeTextColor,
  subColor,
  activeColor,
}: {
  value: 'light' | 'dark' | 'system';
  onChange: (v: 'light' | 'dark' | 'system') => void;
  color: string;
  activeTextColor: string;
  subColor: string;
  activeColor: string;
}) {
  const { t } = useTranslation();
  const options: { v: 'light' | 'dark' | 'system'; label: string }[] = [
    { v: 'system', label: t('settings.themeMode.system') },
    { v: 'light', label: t('settings.themeMode.light') },
    { v: 'dark', label: t('settings.themeMode.dark') },
  ];
  return (
    <View style={[styles.segment, { backgroundColor: activeColor, borderColor: subColor }]}>
      {options.map((opt) => {
        const active = value === opt.v;
        return (
          <Pressable
            key={opt.v}
            onPress={() => onChange(opt.v)}
            style={[styles.segmentItem, { backgroundColor: active ? color : 'transparent' }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={{
                color: active ? activeTextColor : subColor,
                ...typography['label-caps'],
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
    gap: spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography['label-caps'],
    fontWeight: '700',
  },
  groupCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 56,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography['body-md'], flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  value: { ...typography['body-sm'] },
  rowDivider: {
    position: 'absolute',
    left: spacing.md + 32 + spacing.md,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  segment: {
    flexDirection: 'row',
    gap: 2,
    padding: 2,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  logoutPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  loginText: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  logoutText: {
    ...typography['body-md'],
    fontWeight: '700',
    zIndex: 2,
  },
  footerText: {
    ...typography['label-caps'],
    fontSize: 10,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
