/**
 * PageSkeleton - 通用页面骨架屏
 *
 * Why: 数据页加载时白屏/只有 spinner，体验差
 * 统一骨架屏，支持 list/grid/detail 三种布局
 *
 * 用法：
 *   if (isLoading) return <PageSkeleton variant="list" />;
 */
import { StyleSheet, View } from 'react-native';
import { useTheme, spacing, layout } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';

interface PageSkeletonProps {
  variant?: 'list' | 'grid' | 'detail';
  rows?: number;
  testID?: string;
}

export function PageSkeleton({ variant = 'list', rows = 4, testID }: PageSkeletonProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID={testID}>
      {/* Header 占位 */}
      <Skeleton width="100%" height={56} radius={0} />

      {variant === 'list' && (
        <View style={styles.content}>
          {Array.from({ length: rows }).map((_, i) => (
            <View key={i} style={styles.listItem}>
              <Skeleton width={56} height={56} variant="rect" radius={8} />
              <View style={styles.listText}>
                <Skeleton width="80%" height={14} />
                <Skeleton width="50%" height={12} />
              </View>
            </View>
          ))}
        </View>
      )}

      {variant === 'grid' && (
        <View style={styles.content}>
          <View style={styles.gridRow}>
            {Array.from({ length: 2 }).map((_, i) => (
              <View key={i} style={styles.gridItem}>
                <Skeleton width="100%" height={120} radius={8} />
                <Skeleton width="80%" height={12} />
                <Skeleton width="40%" height={16} />
              </View>
            ))}
          </View>
          <View style={styles.gridRow}>
            {Array.from({ length: 2 }).map((_, i) => (
              <View key={i} style={styles.gridItem}>
                <Skeleton width="100%" height={120} radius={8} />
                <Skeleton width="80%" height={12} />
                <Skeleton width="40%" height={16} />
              </View>
            ))}
          </View>
        </View>
      )}

      {variant === 'detail' && (
        <View style={styles.content}>
          <Skeleton width="100%" height={240} radius={0} />
          <View style={styles.detailInfo}>
            <Skeleton width="70%" height={20} />
            <Skeleton width="40%" height={16} />
            <Skeleton width="100%" height={14} />
            <Skeleton width="100%" height={14} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: layout['container-margin'], gap: spacing.md },
  listItem: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  listText: { flex: 1, gap: 6 },
  gridRow: { flexDirection: 'row', gap: spacing.md },
  gridItem: { flex: 1, gap: 6 },
  detailInfo: { gap: 8, marginTop: spacing.md },
});
