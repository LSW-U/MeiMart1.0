// AuthShell — 共享的 auth 页面外壳
// 还原自 5 个 auth 页面 HTML 的共性结构（Header + DiamondPattern + Welcome Card + Cultural Image）
// Fix-16: 避免在 5 个 auth 页面重复同样的 300 行外壳代码
import { StyleSheet, View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { DiamondPattern } from '@/components/cultural/DiamondPattern';
import { Icon } from '@/components/ui/Icon';
import type { AuthShellProps } from './AuthShell.types';

const CULTURAL_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBEQ9pd8vHWPVWbH0PVh2bipzAFX1TaB1i_pm-b1VLDhwtmrQ9aB4gGDPoh1y3hPGaDmOaery53HsMgsPk7y5sx7Nrzy3ZLbNM_t9lTSgGcXlXt80bmFeE-FXCYotnAJZx8NpI5TgyjNyCNwz5M1gdej59aV-CIqdZ5yt0mvnH3IOKkZzwnN9agK7ZVXIIBU2KIe7i2bHm3n91bBFAU2rWcbQFMk-h2VY878FXvH6P1-8ye_jjsXzWoy3JRZWAcBQmFSRQs0JTj';

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
      {/* Header: primary-container + DiamondPattern + Logo */}
      <View
        style={[styles.header, { backgroundColor: colors['primary-container'] }]}
        accessibilityRole="header"
      >
        <View style={styles.headerPattern} pointerEvents="none">
          <DiamondPattern width={390} height={320} opacity={0.2} />
        </View>
        <View style={styles.brandCol}>
          <View
            style={[
              styles.logoBadge,
              {
                backgroundColor: '#ffffff',
                borderColor: 'rgba(150,24,19,0.1)',
              },
            ]}
          >
            <Icon symbol="shopping_basket" size={40} color={colors.primary} />
          </View>
          <Text style={styles.brandTitle}>MEI MART</Text>
          <Text style={styles.brandSubtitle}>EST. 2024 • DILI</Text>
        </View>
      </View>

      {/* Welcome Card（HTML -mt-24 = -96px 上覆盖） */}
      <View
        style={[
          styles.welcomeCard,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderColor: 'rgba(141,112,108,0.1)',
          },
          shadowPresets.xl,
        ]}
      >
        <View style={styles.welcomeText}>
          <Text style={[styles.welcomeTitleText, { color: colors['on-surface'] }]}>
            {welcomeTitle}
          </Text>
          <Text style={[styles.welcomeSubText, { color: colors.secondary }]}>{welcomeSub}</Text>
        </View>

        <View style={styles.formGap}>{children}</View>

        {/* Primary Action — tertiary-container 金色 + arrow_forward */}
        <Pressable
          onPress={onAction}
          disabled={loading}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: colors['tertiary-container'] },
            pressed && { transform: [{ scale: 0.98 }] },
            loading && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Icon symbol="arrow_forward" size={22} color={colors['on-primary']} />
        </Pressable>

        {secondary && <View style={styles.secondaryRow}>{secondary}</View>}
      </View>

      {/* Cultural Anchor Image（HTML 2-col grid） */}
      <View style={styles.culturalGrid}>
        <View style={styles.culturalImageWrap}>
          <Image source={{ uri: CULTURAL_IMAGE }} style={styles.culturalImage} />
          <View style={[styles.culturalOverlay, { backgroundColor: 'rgba(150,24,19,0.1)' }]} />
        </View>
        <View
          style={[styles.culturalTextCard, { backgroundColor: colors['surface-container-high'] }]}
        >
          <Text style={[styles.culturalTitle, { color: colors['on-surface-variant'] }]}>
            Loke Odamatan
          </Text>
          <Text style={[styles.culturalSub, { color: colors.secondary }]}>
            Opening the doors to local quality.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing['container-margin'],
    paddingBottom: spacing.xxl,
  },
  header: {
    position: 'relative',
    height: 320,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
    marginHorizontal: -spacing['container-margin'],
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  brandCol: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadowPresets.md,
  },
  brandTitle: {
    ...typography.h1,
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    ...typography['label-caps'],
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  welcomeCard: {
    marginTop: -96,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    zIndex: 10,
  },
  welcomeText: {
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  welcomeTitleText: {
    ...typography.h2,
    fontWeight: '700',
  },
  welcomeSubText: {
    ...typography['body-md'],
  },
  formGap: {
    gap: spacing.lg,
  },
  actionBtn: {
    height: 56,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    ...shadowPresets.md,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryRow: {
    marginTop: spacing.xl,
  },
  culturalGrid: {
    flexDirection: 'row',
    height: 160,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  culturalImageWrap: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  culturalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.6,
  },
  culturalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  culturalTextCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  culturalTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  culturalSub: {
    ...typography['body-sm'],
  },
});
