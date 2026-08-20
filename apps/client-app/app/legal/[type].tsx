// LegalPage — 用户协议 / 隐私政策（P17 决策 4）
// ⚠️ 无 HTML 原型，按 settings 分组列表样式推导实现，待设计确认
// Why: terms/privacy 同构（标题 + 分段正文），用 [type] 动态路由一页承载，避免两个重复页面。
//      正式文案未提供前显示明确的「内容待法务提供」占位（不伪装成完整条款，方案决策 4）。
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/feedback/EmptyState';

type LegalType = 'terms' | 'privacy' | 'license';
const LEGAL_TYPES: LegalType[] = ['terms', 'privacy', 'license'];

function isLegalType(v: string | undefined): v is LegalType {
  return !!v && (LEGAL_TYPES as string[]).includes(v);
}

export default function LegalPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { type } = useLocalSearchParams<{ type?: string }>();

  // P17 决策 4：非法 type 显示 not found（路由参数校验）
  if (!isLegalType(type)) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <PrimaryHeader
          title={t('settings.legalSection', { defaultValue: 'Privacy & Terms' })}
          showBack
          onBackPress={handleBack}
        />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            title={t('errors.notFoundTitle', { defaultValue: 'Page not found' })}
            description={t('errors.notFoundDesc', { defaultValue: 'The page does not exist' })}
            icon="error-outline"
          />
        </View>
      </SafeAreaWrapper>
    );
  }

  const title = t(`legal.${type}.title`);

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader title={title} showBack onBackPress={handleBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* P17 决策 4：正式文案待法务提供（后端依赖清单 B4）——明确占位，不伪装完整条款 */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
            },
          ]}
        >
          <View style={styles.hintRow}>
            <Icon symbol="info" size={16} color={colors.secondary} />
            <Text style={[styles.hintText, { color: colors['on-surface-variant'] }]}>
              {t('legal.comingSoon')}
            </Text>
          </View>
          <Text style={[styles.body, { color: colors['on-surface'] }]}>{title}</Text>
          <Text style={[styles.bodyDim, { color: colors['on-surface-variant'] }]}>
            © 2026 MeiMart Lda.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  hintText: {
    ...typography['body-sm'],
    flex: 1,
    lineHeight: 20,
  },
  body: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  bodyDim: {
    ...typography['body-sm'],
  },
});
