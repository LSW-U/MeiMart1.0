// AuthShell — 共享的 auth 页面外壳
// P29-D2: 320px primary-container 头图+文化图 → 紧凑品牌区（surface 底，按内容撑开无固定高度）
// P29-D3: CTA tertiary-container 金色 → primary 红色（核心转化操作用品牌红）
// P29-D6: 硬编码 rgba → theme token
// 还原自 P29 HTML 原型 .brand-head（flex:0 0 auto 无固定高度，logo+name+tag+welcome+sub）
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { LocaleSwitch } from '@/components/business/LocaleSwitch/LocaleSwitch';
import type { AuthShellProps } from './AuthShell.types';

export function AuthShell({
  welcomeTitle,
  welcomeSub,
  actionLabel,
  onAction,
  loading = false,
  children,
  secondary,
  testID,
}: AuthShellProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      testID={testID}
      style={{ flex: 1 }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* 紧凑品牌区：surface 底色，按内容撑开（HTML .brand-head padding 48/24/20，gap 10） */}
      <View style={styles.brandHead} accessibilityRole="header">
        <View
          style={[
            styles.brandLogo,
            { backgroundColor: colors.primary, borderColor: colors['outline-variant'] },
          ]}
        >
          <Icon symbol="shopping_basket" size={30} color={colors['on-primary']} />
        </View>
        <Text style={[styles.brandName, { color: colors.primary }]}>MeiMart</Text>
        <Text style={[styles.brandTag, { color: colors['on-surface-variant'] }]}>
          EST. 2024 • DILI
        </Text>
        <Text style={[styles.brandWelcome, { color: colors['on-surface'] }]}>{welcomeTitle}</Text>
        <Text style={[styles.brandSub, { color: colors['on-surface-variant'] }]}>{welcomeSub}</Text>
      </View>

      {/* 表单卡（HTML .form-card surface-lowest + shadow-md） */}
      <View
        style={[
          styles.formCard,
          { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
          shadowPresets.md,
        ]}
      >
        <View style={styles.formGap}>{children}</View>

        {/* Primary Action — P29-D3: primary 红色 + arrow_forward */}
        <Pressable
          onPress={onAction}
          disabled={loading}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
            loading && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: loading }}
        >
          <Text style={[styles.actionText, { color: colors['on-primary'] }]}>{actionLabel}</Text>
          <Icon symbol="arrow_forward" size={22} color={colors['on-primary']} />
        </Pressable>

        {secondary && <View style={styles.secondaryRow}>{secondary}</View>}
      </View>

      {/* 语言切换按钮（底部，所有 auth 页面共用） */}
      <LocaleSwitch />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout['container-margin'],
    paddingBottom: spacing.xxl,
  },
  // HTML .brand-head: padding 48px 24px 20px, align center, gap 10, surface 底
  brandHead: {
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  // HTML .brand-logo: 56px 圆角 16 primary 底白字，shadow 0 4 14 rgba(150,24,19,.25)
  brandLogo: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...shadowPresets.md,
  },
  // HTML .brand-name: 22px 800 primary
  brandName: {
    ...typography.h2,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  // HTML .brand-tag: 12px on-sv2
  brandTag: {
    ...typography['label-caps'],
  },
  // HTML .brand-welcome: 20px 700 on-surface
  brandWelcome: {
    ...typography.h3,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  // HTML .brand-sub: 13px on-sv
  brandSub: {
    ...typography['body-sm'],
  },
  formCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
  },
  formGap: {
    gap: spacing.lg,
  },
  actionBtn: {
    height: 52,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    ...shadowPresets.md,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryRow: {
    marginTop: spacing.xl,
  },
});
