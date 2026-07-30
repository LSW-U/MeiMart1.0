import { StyleSheet, View } from 'react-native';
import { useTheme, spacing, borderRadius } from '@/theme';
import { CategoryItem, MoreItem } from '@/components/business/CategoryItem';
import type { CategoryItemSize } from '@/components/business/CategoryItem/CategoryItem.types';
import type { Category } from '@/types';
import type { CategoryGridProps } from './CategoryGrid.types';

// Why: P6 V1f + 模块方案 §2.2 - MAX_VISIBLE=7，>7 时前 7 + 第 8 格 More（跳全量列表）
const MAX_VISIBLE = 7;

type Cell = { type: 'category'; category: Category } | { type: 'more' };

export function CategoryGrid({
  categories,
  columns = 4,
  itemSize = 'md',
  onCategoryPress,
  onMorePress,
  testID,
}: CategoryGridProps) {
  const { colors } = useTheme();
  const visible = categories.slice(0, MAX_VISIBLE);
  const hasMore = categories.length > MAX_VISIBLE;

  // Why: cells = visible + (hasMore ? More 占位)
  const cells: Cell[] = visible.map((category) => ({ type: 'category', category }));
  if (hasMore) cells.push({ type: 'more' });

  // Why: 行分发 - 每 columns 个一行，不足补空格保持等宽
  const rows: { id: string; data: Cell[] }[] = [];
  for (let i = 0; i < cells.length; i += columns) {
    rows.push({ id: `row-${i}`, data: cells.slice(i, i + columns) });
  }

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        // Why: P6 V1c C2 - 白底圆角卡包裹（替代纯白贴边无圆角），圆角 16 + padding 16/14
        {
          backgroundColor: colors['surface-container-lowest'],
          borderRadius: borderRadius['2xl'],
        },
      ]}
    >
      {rows.map((row) => (
        <View key={row.id} style={styles.row}>
          {row.data.map((cell, idx) => (
            <View key={cell.type === 'more' ? 'more' : cell.category.id} style={styles.cell}>
              {cell.type === 'more' ? (
                <MoreItemWrapper size={itemSize} onPress={onMorePress} />
              ) : (
                <CategoryItem
                  category={cell.category}
                  size={itemSize}
                  onPress={onCategoryPress}
                />
              )}
            </View>
          ))}
          {/* Why: 最后一行不足 columns 时补空格，保持 cell flex:1 等宽对齐 */}
          {row.data.length < columns &&
            Array.from({ length: columns - row.data.length }).map((_, idx) => (
              <View key={`empty-${row.id}-${idx}`} style={styles.cell} />
            ))}
        </View>
      ))}
    </View>
  );
}

// Why: 薄封装 - MoreItem 已自带 size/onPress，这里仅透传（保留未来扩展点）
function MoreItemWrapper({
  size,
  onPress,
}: {
  size: CategoryItemSize;
  onPress?: () => void;
}) {
  return <MoreItem size={size} onPress={onPress} />;
}

const styles = StyleSheet.create({
  // Why: P6 V1c C2 - 卡片内 padding 16/14（上下 spacing.md=16，左右 14 介于 sm/md 之间，方案 §1.3.1 指定）
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    // Why: P6 G2 - 行 gap sm(8) -> md(16)（方案 §2.2 写 md(14) 笔误，spacing.md=16 token 化为准）
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  cell: { flex: 1, alignItems: 'center' },
});
