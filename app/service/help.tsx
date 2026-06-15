import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Card } from '@/components/ui/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FAQ_IDS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

export default function HelpCenterPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState<string | null>('q1');

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={t('service.help.title')} showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: colors['on-surface-variant'] }]}>
          {t('service.help.intro')}
        </Text>
        <View style={styles.list}>
          {FAQ_IDS.map((id) => {
            const isOpen = expanded === id;
            return (
              <Card key={id}>
                <Pressable
                  testID={`faq-${id}`}
                  onPress={() => setExpanded(isOpen ? null : id)}
                  style={({ pressed }) => [styles.faqHeader, { opacity: pressed ? 0.7 : 1 }]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={t(`service.help.faq.${id}`)}
                >
                  <Text style={[styles.question, { color: colors['on-surface'] }]}>
                    {t(`service.help.faq.${id}`)}
                  </Text>
                  <MaterialCommunityIcons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors['on-surface-variant']}
                  />
                </Pressable>
                {isOpen && (
                  <Text style={[styles.answer, { color: colors['on-surface-variant'] }]}>
                    {t(`service.help.faq.a${id.slice(1)}`)}
                  </Text>
                )}
              </Card>
            );
          })}
        </View>
        <View style={styles.contactBox}>
          <Text style={[styles.contactText, { color: colors['on-surface-variant'] }]}>
            {t('service.help.contactPrompt')}
          </Text>
          <Pressable
            onPress={() => router.push('/service')}
            accessibilityRole="button"
            accessibilityLabel={t('service.help.contactLink')}
          >
            <Text style={[styles.contactLink, { color: colors.primary }]}>
              {t('service.help.contactLink')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  intro: { ...typography['body-sm'], paddingHorizontal: spacing.xs },
  list: { gap: spacing.md },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  question: { ...typography['body-md'], fontWeight: '600', flex: 1 },
  answer: {
    ...typography['body-sm'],
    lineHeight: 22,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  contactText: { ...typography['body-sm'] },
  contactLink: { ...typography['body-sm'], fontWeight: '600' },
});
