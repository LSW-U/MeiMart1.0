import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { useTheme, spacing, typography } from '@/theme';

// Why: 方案 §7.2 - 词项热度浅红 coral-400，不用 P7 强红（colors.primary #961813）
//   suggestion 是当前输入联想（非榜单 TOP），视觉重量不应抢输入框焦点
const HEAT_COLOR = '#D85A30';

/**
 * 数字格式化（方案 §7.2）：
 * - 0 次不渲染标签
 * - >1000 显 1.2k
 * - >10000 显 12k+
 */
function formatHeat(count: number): string | null {
  if (count <= 0) return null;
  if (count >= 10000) return `${Math.floor(count / 1000)}k+`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return `${count}`;
}

export interface SuggestWordItemProps {
  word: string;
  searchCount: number;
  onPress: () => void;
  testID?: string;
}

/**
 * 词联想项（方案 §7.2）：行高 44px，左词 14px（body-sm）+ 右浅红热度数字 11px。
 * 左 padding 16px（spacing.md）。无左 icon（对齐方案 mock「apple 🔥1.3k」左词右数字）。
 */
export function SuggestWordItem({ word, searchCount, onPress, testID }: SuggestWordItemProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const heat = formatHeat(searchCount);
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t('search.searchTerm', { term: word })}
    >
      <Text style={[styles.word, { color: colors['on-surface'] }]} numberOfLines={1}>
        {word}
      </Text>
      {heat && (
        <View style={[styles.heatTag, { backgroundColor: colors['surface-container-high'] }]}>
          <Icon symbol="trending_up" size={10} color={HEAT_COLOR} />
          <Text style={[styles.heatText, { color: HEAT_COLOR }]}>{heat}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  pressed: { opacity: 0.6 },
  word: {
    ...typography['body-sm'],
    flex: 1,
  },
  heatTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  heatText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
