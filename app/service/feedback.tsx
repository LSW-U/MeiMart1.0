import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';

const FEEDBACK_TYPES = ['功能建议', '商品问题', '订单问题', '支付问题', '物流问题', '其他'];

export default function FeedbackPage() {
  const { colors } = useTheme();
  const [type, setType] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');

  const submit = () => {
    if (!type) {
      Alert.alert('提示', '请选择反馈类型');
      return;
    }
    if (!content.trim()) {
      Alert.alert('提示', '请填写反馈内容');
      return;
    }
    Alert.alert('已提交', '感谢你的反馈', [{ text: '确定', onPress: () => router.back() }]);
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="意见反馈" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>反馈类型</Text>
          <View style={styles.tagsRow}>
            {FEEDBACK_TYPES.map((t) => (
              <Chip
                key={t}
                label={t}
                selected={type === t}
                onSelect={() => setType(type === t ? '' : t)}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>反馈内容</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="请详细描述你的反馈…"
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
          <Text style={[styles.label, { color: colors['on-surface'] }]}>联系方式（可选）</Text>
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder="邮箱或手机号，方便我们回复你"
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
          label="提交反馈"
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
