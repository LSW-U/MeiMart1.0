// AuthShell — 共享的 auth 页面外壳
// 严格还原 P29 HTML 原型五屏共通结构：
//   .brand-head（紧凑品牌区：logo+name+tag+welcome+sub）
//   .form-card（白卡表单，children + .btn-primary CTA）
//   .switch-row（卡外底部次要切换，如「新用户？注册账号」）
//   .locale-bar（底部语言条）
// P29-D2: 320px 头图+文化图 → 紧凑品牌区（surface 底按内容撑开）
// P29-D3: CTA tertiary 金 → primary 红（.btn-primary 52px 圆角 14，纯文字无箭头）
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, shadowPresets } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { LocaleBar } from '@/components/business/LocaleSwitch/LocaleBar';
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
  const { t } = useTranslation();

  return (
    <ScrollView
      testID={testID}
      style={{ flex: 1 }}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* .brand-head：padding 48 24 20，gap 10，surface 底 */}
      <View style={styles.brandHead} accessibilityRole="header">
        <View style={[styles.brandLogo, { backgroundColor: colors.primary }]}>
          <Icon symbol="shopping_basket" size={30} color={colors['on-primary']} />
        </View>
        <Text style={[styles.brandName, { color: colors.primary }]}>MeiMart</Text>
        <Text style={[styles.brandTag, { color: colors['on-surface-variant'] }]}>
          {t('about.subtitle')}
        </Text>
        <Text style={[styles.brandWelcome, { color: colors['on-surface'] }]}>{welcomeTitle}</Text>
        <Text style={[styles.brandSub, { color: colors['on-surface-variant'] }]}>{welcomeSub}</Text>
      </View>

      {/* .form-card：surface-lowest 白卡 + shadow-md，无描边（原型无 border） */}
      <View
        style={[styles.formCard, { backgroundColor: colors['surface-container-lowest'] }, shadowPresets.md]}
      >
        <View style={styles.formGap}>{children}</View>

        {/* .btn-primary：52px 圆角 14 primary 底白字，纯文字 */}
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
        </Pressable>
      </View>

      {/* .switch-row：卡外底部次要切换（如「新用户？注册账号」） */}
      {secondary && <View style={styles.switchRow}>{secondary}</View>}

      {/* 弹性占位：内容不足一屏时把 LocaleBar 推到最底（原型 .screen flex column + locale-bar flex:0 0 auto） */}
      <View style={styles.spacer} />

      {/* .locale-bar：底部语言条 */}
      <LocaleBar />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: layout['container-margin'],
    // flexGrow:1 让内容不足一屏时也撑满，LocaleBar 能沉到屏幕底部（原型 .screen flex column）
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  // .brand-head{padding:48px 24px 20px;gap:10px;align-items:center}
  brandHead: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  // .brand-logo{56px 圆角 16 primary 底白 icon，shadow 0 4 14 rgba(150,24,19,.25)}
  brandLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowPresets.md,
  },
  // .brand-name{22px 800 primary letter-spacing -.3px}
  brandName: {
    ...typography.h2,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  // .brand-tag{12px on-sv2}
  brandTag: {
    fontSize: 12,
    lineHeight: 16,
  },
  // .brand-welcome{20px 700 on-surface margin-top 6}
  brandWelcome: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    marginTop: 6,
  },
  // .brand-sub{13px on-sv}
  brandSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  // .form-card{surface-lowest 圆角 18 padding 20 gap 16 shadow-md}
  formCard: {
    borderRadius: 18,
    padding: 20,
  },
  formGap: {
    gap: 16,
  },
  // .btn-primary{height 52 圆角 14 primary 白字 16/700}
  actionBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...shadowPresets.md,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // .switch-row{text-align center padding 16 0 4}
  switchRow: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  // 内容不足一屏时的弹性占位（LocaleBar 沉底）
  spacer: {
    flex: 1,
    minHeight: spacing.lg,
  },
});
