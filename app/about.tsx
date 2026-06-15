import { StyleSheet, View, Text, Linking, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { LogoBadge } from '@/components/cultural/LogoBadge';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { UmaLulikSkyline } from '@/components/cultural/UmaLulikSkyline';

const APP_VERSION = '1.0.0';

export default function AboutPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBarConfig />
      <PageHeader
        title={t('about.title')}
        showBack
        onBackPress={() => router.back()}
        testID="about-back"
      />
      <View style={styles.content}>
        <View style={styles.brand}>
          <LogoBadge size={80} />
          <Text
            style={[styles.appName, { color: colors['on-surface'] }]}
            accessibilityRole="header"
          >
            MeiMart
          </Text>
          <Text style={[styles.version, { color: colors['on-surface-variant'] }]}>
            v{APP_VERSION}
          </Text>
        </View>
        <TaisDivider />
        <View style={styles.cultural}>
          <UmaLulikSkyline height={80} />
          <Text style={[styles.mission, { color: colors['on-surface'] }]}>
            {t('about.mission')}
          </Text>
        </View>
        <View style={[styles.infoBlock, { backgroundColor: colors['surface-container-low'] }]}>
          <InfoRow
            label={t('about.company')}
            value="MeiMart Lda."
            color={colors['on-surface']}
            subColor={colors['on-surface-variant']}
          />
          <InfoRow
            label={t('about.address')}
            value="Dili, Timor-Leste"
            color={colors['on-surface']}
            subColor={colors['on-surface-variant']}
          />
          <InfoRow
            label={t('about.email')}
            value="support@meimart.tl"
            color={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="about-email"
            onPress={() => Linking.openURL('mailto:support@meimart.tl')}
          />
        </View>
        <Text style={[styles.copyright, { color: colors['on-surface-variant'] }]}>
          © 2026 MeiMart. {t('about.rights')}
        </Text>
      </View>
    </SafeAreaWrapper>
  );
}

function InfoRow({
  label,
  value,
  color,
  subColor,
  testID,
  onPress,
}: {
  label: string;
  value: string;
  color: string;
  subColor: string;
  testID?: string;
  onPress?: () => void;
}) {
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper testID={testID} onPress={onPress} style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: subColor }]}>{label}</Text>
      <Text style={[styles.infoValue, { color }]}>{value}</Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  brand: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  appName: { ...typography.h2, fontWeight: '700' },
  version: { ...typography['body-sm'] },
  cultural: { alignItems: 'center', gap: spacing.md },
  mission: { ...typography['body-md'], textAlign: 'center', lineHeight: 22 },
  infoBlock: { borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  infoLabel: { ...typography['body-sm'] },
  infoValue: { ...typography['body-md'], fontWeight: '500' },
  copyright: {
    ...typography['label-caps'],
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
