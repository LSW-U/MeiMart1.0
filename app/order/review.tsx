import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, Alert, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';

const TAGS = ['质量好', '物流快', '包装好', '性价比高', '新鲜', '值得回购'];
const RATING_LABELS = ['非常差', '差', '一般', '好', '非常好'];

export default function OrderReviewPage() {
  const { colors } = useTheme();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const submit = () => {
    if (!content.trim()) {
      Alert.alert('提示', '请填写评价内容');
      return;
    }
    Alert.alert('成功', '评价已提交', [{ text: '确定', onPress: () => router.back() }]);
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="发表评价" showBack onBackPress={() => router.back()} />
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
              <Text style={[styles.productMeta, { color: colors['on-surface-variant'] }]}>x 2</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>商品评分</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Button
                key={n}
                label="★"
                variant="text"
                onPress={() => setRating(n)}
                testID={`star-${n}`}
              />
            ))}
            <Text style={[styles.ratingLabel, { color: colors.primary }]}>
              {RATING_LABELS[rating - 1]}
            </Text>
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>评价内容</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="分享你的使用体验…"
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
            testID="review-content"
          />
          <View style={styles.tagsRow}>
            {TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <Chip key={tag} label={tag} selected={active} onSelect={() => toggleTag(tag)} />
              );
            })}
          </View>
        </Card>

        <Button
          label="提交评价"
          variant="primary"
          fullWidth
          onPress={submit}
          testID="review-submit"
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
  label: { ...typography['body-md'], fontWeight: '600', marginBottom: spacing.sm },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ratingLabel: { ...typography['body-sm'], marginLeft: spacing.sm },
  textarea: {
    minHeight: 100,
    padding: spacing.md,
    borderRadius: 8,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
    ...typography['body-md'],
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

void useLocalSearchParams;
