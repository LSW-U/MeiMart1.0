import { StyleSheet, View } from 'react-native';
import { useTheme, spacing } from '@/theme';
import { CategoryItem } from '@/components/business/CategoryItem';
import type { CategoryGridProps } from './CategoryGrid.types';

export function CategoryGrid({
  categories,
  columns = 4,
  itemSize = 'md',
  onCategoryPress,
  testID,
}: CategoryGridProps) {
  const { colors } = useTheme();
  const rows: { id: string; data: typeof categories }[] = [];
  for (let i = 0; i < categories.length; i += columns) {
    rows.push({ id: `row-${i}`, data: categories.slice(i, i + columns) });
  }

  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor: colors['surface-container-lowest'] }]}
    >
      {rows.map((row) => (
        <View key={row.id} style={styles.row}>
          {row.data.map((category) => (
            <View key={category.id} style={styles.cell}>
              <CategoryItem category={category} size={itemSize} onPress={onCategoryPress} />
            </View>
          ))}
          {row.data.length < columns &&
            Array.from({ length: columns - row.data.length }).map((_, idx) => (
              <View key={`empty-${row.id}-${idx}`} style={styles.cell} />
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.sm, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  cell: { flex: 1, alignItems: 'center' },
});
