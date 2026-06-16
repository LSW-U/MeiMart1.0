// ⚠️ 无 HTML 原型，参考 ProfilePage 推导实现，待设计确认
// SettingsPage — 设置页（参考 ProfilePage.html 的分组列表样式）
// D.13: PrimaryHeader + 分组设置项（外观/通用/隐私/关于）+ 退出登录
import { StyleSheet, View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Switch } from '@/components/ui/Switch';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import type { ReactNode } from 'react';

export default function SettingsPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const locale = useAppStore((s) => s.locale);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const setMode = (mode: 'light' | 'dark' | 'system') => setThemeMode(mode);

  const clearCache = () => Alert.alert(t('common.notice'), t('settings.clearCacheDone'));
  const logout = () => {
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
      edges={['bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBarConfig />
      <PrimaryHeader title={t('settings.title')} showBack onBackPress={() => router.back()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 外观分组 */}
        <SectionTitle title={t('settings.appearance')} color={colors['on-surface-variant']} />
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
            iconBg="#a855f7"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-theme"
          >
            <SegmentSwitch
              value={themeMode}
              onChange={setMode}
              color={colors.primary}
              subColor={colors['on-surface-variant']}
              activeColor={colors['surface-container-low']}
            />
          </RowItem>
        </View>

        {/* 通用分组 */}
        <SectionTitle title={t('settings.general')} color={colors['on-surface-variant']} />
        <View
          style={[
            styles.groupCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <PressableRow
            label={t('settings.language')}
            icon="language"
            iconBg="#3b82f6"
            value={locale === 'zh' ? '中文' : locale === 'en' ? 'English' : locale.toUpperCase()}
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-language"
            onPress={() => router.push('/language')}
          />
          <RowItem
            label={t('settings.push')}
            icon="notifications"
            iconBg="#f59e0b"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
          >
            <Switch value onValueChange={() => {}} />
          </RowItem>
          <PressableRow
            label={t('settings.clearCache')}
            icon="delete"
            iconBg="#ef4444"
            value="1.2 MB"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-cache"
            onPress={clearCache}
          />
        </View>

        {/* 隐私分组 */}
        <SectionTitle
          title={t('settings.privacy', { defaultValue: 'Privacy & Security' })}
          color={colors['on-surface-variant']}
        />
        <View
          style={[
            styles.groupCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <PressableRow
            label={t('settings.accountSecurity', { defaultValue: 'Account Security' })}
            icon="lock"
            iconBg="#10b981"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-security"
            onPress={() => {}}
          />
          <PressableRow
            label={t('settings.privacyPolicy', { defaultValue: 'Privacy Policy' })}
            icon="security"
            iconBg="#6366f1"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-privacy"
            onPress={() => {}}
          />
        </View>

        {/* 关于分组 */}
        <SectionTitle title={t('settings.aboutSection')} color={colors['on-surface-variant']} />
        <View
          style={[
            styles.groupCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <PressableRow
            label={t('settings.version')}
            icon="info"
            iconBg={colors.primary}
            value="v1.0.0"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-version"
            onPress={() => {}}
          />
          <PressableRow
            label={t('settings.about')}
            icon="info"
            iconBg={colors.primary}
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-about"
            onPress={() => router.push('/about')}
          />
          <PressableRow
            label={t('settings.terms')}
            icon="auto_stories"
            iconBg="#8b5cf6"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            dividerColor={colors['outline-variant']}
            testID="settings-tos"
            onPress={() => {}}
          />
        </View>

        {/* 退出登录（带 TaisPattern 装饰） */}
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

        <Text style={[styles.footerText, { color: colors['on-surface-variant'] }]}>
          MeiMart v1.0.0 · © 2026 MeiMart Lda.
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
  color,
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
  color: string;
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
        <Icon symbol={icon} size={18} color="#ffffff" />
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
  value,
  color,
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
  value?: string;
  color: string;
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
        <Icon symbol={icon} size={18} color="#ffffff" />
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
  subColor,
  activeColor,
}: {
  value: 'light' | 'dark' | 'system';
  onChange: (v: 'light' | 'dark' | 'system') => void;
  color: string;
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
                color: active ? '#ffffff' : subColor,
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
    padding: spacing['container-margin'],
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
