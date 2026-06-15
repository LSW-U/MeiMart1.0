import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';

const FEEDBACK_TYPE_KEYS = [
  'service.feedback.types.feature',
  'service.feedback.types.product',
  'service.feedback.types.order',
  'service.feedback.types.payment',
  'service.feedback.types.shipping',
  'service.feedback.types.other',
];

export default function FeedbackPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [typeKey, setTypeKey] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');

  const submit = () => {
    if (!typeKey) {
      Alert.alert(t('common.notice'), t('service.feedback.selectType'));
      return;
    }
    if (!content.trim()) {
      Alert.alert(t('common.notice'), t('service.feedback.fillContent'));
      return;
    }
    Alert.alert(t('common.submitted'), t('service.feedback.submitted'), [
      { text: t('common.ok'), onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={t('service.feedback.title')} showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('service.feedback.type')}
          </Text>
          <View style={styles.tagsRow}>
            {FEEDBACK_TYPE_KEYS.map((key) => (
              <Chip
                key={key}
                label={t(key)}
                selected={typeKey === key}
                onSelect={() => setTypeKey(typeKey === key ? '' : key)}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('service.feedback.content')}
          </Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={t('service.feedback.placeholder')}
            placeholderTextColor={colors['on-surface-variant']}
            multiline
            numberOfLines={6}
            maxLength={500}
            style={[
              styles.textarea,
              {
                color: colors['on-surface'],
                backgroundColor: colors['surface-container-low'],
              },
            ]}
            testID="feedback-content"
          />
          <Text style={[styles.counter, { color: colors['on-surface-variant'] }]}>
            {content.length} / 500
          </Text>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('service.feedback.contact')}
          </Text>
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder={t('service.feedback.contactPlaceholder')}
            placeholderTextColor={colors['on-surface-variant']}
            style={[
              styles.input,
              {
                color: colors['on-surface'],
                backgroundColor: colors['surface-container-low'],
              },
            ]}
            testID="feedback-contact"
          />
        </Card>

        <Button
          label={t('service.feedback.submit')}
          variant="primary"
          fullWidth
          onPress={submit}
          testID="feedback-submit"
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  label: { ...typography['body-md'], fontWeight: '600', marginBottom: spacing.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  textarea: {
    minHeight: 120,
    padding: spacing.md,
    borderRadius: 8,
    textAlignVertical: 'top',
    ...typography['body-md'],
  },
  counter: {
    ...typography['label-caps'],
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  input: {
    padding: spacing.md,
    borderRadius: 8,
    ...typography['body-md'],
  },
});
