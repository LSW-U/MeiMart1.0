import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';

const REFUND_REASONS = ['商品损坏', '与描述不符', '质量问题', '发错/漏发', '7 天无理由'];
const REFUND_TYPES = [
  { id: 'refund-only', label: '仅退款' },
  { id: 'return-refund', label: '退货退款' },
];

export default function AfterSalesApplyPage() {
  const { colors } = useTheme();
  const [type, setType] = useState('refund-only');
  const [reason, setReason] = useState('');
  const [content, setContent] = useState('');

  const submit = () => {
    if (!reason) {
      Alert.alert('提示', '请选择退款原因');
      return;
    }
    Alert.alert('已提交', '售后申请已提交，等待商家审核', [
      { text: '确定', onPress: () => router.replace('/order/after-sales-detail') },
    ]);
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="申请售后" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.productRow}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200',
              }}
              style={styles.productImg}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.productName, { color: colors['on-surface'] }]} numberOfLines={2}>
                新鲜红富士苹果
              </Text>
              <Text style={[styles.productMeta, { color: colors['on-surface-variant'] }]}>x 1</Text>
            </View>
            <Text style={[styles.productPrice, { color: colors.primary }]}>$25.90</Text>
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>售后类型</Text>
          <View style={styles.typesRow}>
            {REFUND_TYPES.map((t) => {
              const active = type === t.id;
              return (
                <Chip key={t.id} label={t.label} selected={active} onSelect={() => setType(t.id)} />
              );
            })}
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>退款原因</Text>
          <View style={styles.tagsRow}>
            {REFUND_REASONS.map((r) => (
              <Chip
                key={r}
                label={r}
                selected={reason === r}
                onSelect={() => setReason(reason === r ? '' : r)}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>问题描述</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="请详细描述你遇到的问题…"
            placeholderTextColor={colors['on-surface-variant']}
            multiline
            numberOfLines={4}
            style={[
              styles.textarea,
              {
                color: colors['on-surface'],
                backgroundColor: colors['surface-container-low'],
              },
            ]}
            testID="aftersales-content"
          />
        </Card>

        <Button
          label="提交申请"
          variant="primary"
          fullWidth
          onPress={submit}
          testID="aftersales-submit"
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  productRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  productImg: { width: 60, height: 60, borderRadius: 8 },
  productName: { ...typography['body-sm'], fontWeight: '500' },
  productMeta: { ...typography['label-caps'], marginTop: 4 },
  productPrice: { ...typography['body-md'], fontWeight: '700' },
  label: { ...typography['body-md'], fontWeight: '600', marginBottom: spacing.sm },
  typesRow: { flexDirection: 'row', gap: spacing.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  textarea: {
    minHeight: 100,
    padding: spacing.md,
    borderRadius: 8,
    textAlignVertical: 'top',
    ...typography['body-md'],
  },
});
