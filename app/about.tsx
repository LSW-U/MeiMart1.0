// ⚠️ 无 HTML 原型，参考 SplashPage 推导实现，待设计确认
// AboutPage — 品牌展示页（参考 SplashPage.html 192 行的视觉风格）
// D.1: Primary tais-pattern Header + DiamondPattern 背景 + LogoBadge + 文化装饰
import { StyleSheet, View, Text, Linking, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { LogoBadge } from '@/components/cultural/LogoBadge';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { UmaLulikSkyline } from '@/components/cultural/UmaLulikSkyline';
import { DiamondPattern } from '@/components/cultural/DiamondPattern';
import { Icon } from '@/components/ui/Icon';

const APP_VERSION = '1.0.0';

export default function AboutPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaWrapper
      edges={['bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={t('about.title')}
        showBack
        onBackPress={() => router.back()}
        testID="about-back"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* DiamondPattern 装饰背景（参考 SplashPage 第 150 行） */}
        <View style={styles.diamondBg} pointerEvents="none">
          <DiamondPattern width={200} height={200} opacity={0.04} />
        </View>

        {/* 品牌区（参考 SplashPage 第 151-164 行） */}
        <View style={styles.brand}>
          <View style={[styles.logoWrap, shadowPresets.md]}>
            <LogoBadge size={96} testID="about-logo" />
          </View>
          <Text
            style={[styles.appName, { color: colors['on-surface'] }]}
            accessibilityRole="header"
          >
            MeiMart
          </Text>
          <Text style={[styles.tagline, { color: colors.primary }]}>
            {t('about.tagline', { defaultValue: 'Tolu Hamutuk Sosa Fácil' })}
          </Text>
          <Text style={[styles.subTagline, { color: colors['on-surface-variant'] }]}>
            {t('about.subtitle', { defaultValue: 'Your Local Marketplace in Timor-Leste' })}
          </Text>
        </View>

        {/* Tais Divider（文化分割） */}
        <View style={styles.dividerWrap}>
          <TaisDivider width={140} />
        </View>

        {/* 文化使命区 */}
        <View
          style={[
            styles.culturalCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.taisStrip} pointerEvents="none">
            <TaisPattern width={400} height={40} opacity={0.18} />
          </View>
          <View style={styles.skylineWrap}>
            <UmaLulikSkyline height={48} />
          </View>
          <Text style={[styles.mission, { color: colors['on-surface'] }]}>
            {t('about.mission')}
          </Text>
        </View>

        {/* 信息卡片 */}
        <View
          style={[
            styles.infoBlock,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('about.contactTitle', { defaultValue: 'Contact' })}
          </Text>

          <InfoRow
            icon="account_balance"
            label={t('about.company')}
            value="MeiMart Lda."
            color={colors['on-surface']}
            subColor={colors['on-surface-variant']}
          />

          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />

          <InfoRow
            icon="location_on"
            label={t('about.address')}
            value="Dili, Timor-Leste"
            color={colors['on-surface']}
            subColor={colors['on-surface-variant']}
          />

          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />

          <InfoRow
            icon="mail"
            label={t('about.email')}
            value="support@meimart.tl"
            color={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="about-email"
            onPress={() => Linking.openURL('mailto:support@meimart.tl')}
          />

          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />

          <InfoRow
            icon="phone"
            label={t('about.phone', { defaultValue: 'Phone' })}
            value="+670 7700 0000"
            color={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="about-phone"
            onPress={() => Linking.openURL('tel:+67077000000')}
          />
        </View>

        {/* 版本号 + Copyright */}
        <View style={styles.footer}>
          <Text style={[styles.version, { color: colors['on-surface-variant'] }]}>
            v{APP_VERSION}
          </Text>
          <Text style={[styles.copyright, { color: colors['on-surface-variant'] }]}>
            © 2026 MeiMart. {t('about.rights')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

function InfoRow({
  icon,
  label,
  value,
  color,
  subColor,
  testID,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  subColor: string;
  testID?: string;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.infoRow, pressed && onPress && { opacity: 0.6 }]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[styles.infoIcon, { backgroundColor: 'rgba(150,24,19,0.08)' }]}>
        <Icon symbol={icon} size={18} color="#961813" />
      </View>
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: subColor }]}>{label}</Text>
        <Text style={[styles.infoValue, { color }]}>{value}</Text>
      </View>
      {onPress && <Icon symbol="chevron_right" size={18} color={subColor} />}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    position: 'relative',
  },
  diamondBg: {
    position: 'absolute',
    top: -spacing.md,
    right: -spacing.md,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    marginTop: spacing.md,
  },
  logoWrap: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  appName: {
    ...typography.h1,
    fontWeight: '700',
  },
  tagline: {
    ...typography['label-caps'],
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: spacing.xs,
  },
  subTagline: {
    ...typography['body-sm'],
    opacity: 0.8,
    marginTop: 2,
  },
  dividerWrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    opacity: 0.5,
  },
  culturalCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  taisStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  skylineWrap: {
    width: '100%',
    marginTop: spacing.md,
  },
  mission: {
    ...typography['body-md'],
    textAlign: 'center',
    lineHeight: 22,
  },
  infoBlock: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography['label-caps'],
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
    minHeight: 56,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  infoLabel: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  infoValue: {
    ...typography['body-md'],
    fontWeight: '500',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  version: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  copyright: {
    ...typography['label-caps'],
    fontSize: 10,
    textAlign: 'center',
  },
});
