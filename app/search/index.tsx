import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { SearchBar } from '@/components/business/SearchBar';
import { EmptyState } from '@/components/feedback/EmptyState';

const HOT_KEYWORDS = ['苹果', '牛奶', '抽纸', '鸡蛋', '啤酒', '牙膏'];

export default function SearchIndexPage() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <View style={[styles.header, { backgroundColor: colors['surface-container-lowest'] }]}>
        <SearchBar
          value={query}
          onChange={setQuery}
          autoFocus
          placeholder="搜索商品、品牌、分类…"
          onSubmit={(q) => q.trim() && router.push({ pathname: '/search/results', params: { q } })}
        />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors['on-surface'] }]}>热门搜索</Text>
        <View style={styles.tags}>
          {HOT_KEYWORDS.map((kw) => (
            <Pressable
              key={kw}
              testID={`hot-${kw}`}
              onPress={() => router.push({ pathname: '/search/results', params: { q: kw } })}
              style={({ pressed }) => [
                styles.tag,
                { backgroundColor: colors['surface-container-low'], opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.tagText, { color: colors['on-surface'] }]}>{kw}</Text>
            </Pressable>
          ))}
        </View>
        <EmptyState
          title="输入关键词搜索"
          description="试试搜索「苹果」「牛奶」等热门商品"
          icon="magnify"
        />
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.md },
  body: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  title: { ...typography.h3, fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 16 },
  tagText: { ...typography['body-sm'] },
});

void FlatList;
