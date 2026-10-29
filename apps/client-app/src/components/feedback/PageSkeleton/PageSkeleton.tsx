/**
 * PageSkeleton - 通用页面骨架屏
 *
 * Why: 数据页加载时白屏/只有 spinner，体验差
 * 统一骨架屏，支持 list/grid/detail 三种布局
 *
 * 用法：
 *   if (isLoading) return <PageSkeleton variant="list" />;
 */
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, spacing, layout } from '@/theme';
import { Skeleton } from '@/components/ui/Skeleton';

interface PageSkeletonProps {
  variant?: 'list' | 'grid' | 'detail';
  rows?: number;
  testID?: string;
}

export function PageSkeleton({ variant = 'list', rows = 4, testID }: PageSkeletonProps) {
  const { colors } = useTheme();

  // shimmer 流光（落容器层，三款变体之上统一叠加；ui/Skeleton 原子呼吸式不受影响）
  // RN Animated translateX 循环滑移；useNativeDriver 仅支持非布局属性，translateX 合规
  // useState 惰性初始化保持 Animated.Value 引用稳定（useRef().current 在 render 期读值被 react-hooks/refs 拦截）
  const [translateX] = useState(() => new Animated.Value(-1));
  // 容器宽度由 onLayout 量得；未量到前用 0（native 插值 outputRange 必须是数值，
  // 百分比字符串在 useNativeDriver:true 下非法——RN native 插值仅支持数值/color）
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [translateX]);

  // 高光层定位：光带宽 = 容器宽 40%，滑移区间 ±1.5×容器宽（dp 数值），
  // 保证光带完整扫出视口两侧； Animated.Value 初始 -1 与 inputRange 对齐
  const shimmerTranslate = translateX.interpolate({
    inputRange: [-1, 1],
    outputRange: [-1.5 * containerWidth, 1.5 * containerWidth],
  });

  const containerTestID = testID ?? 'page-skeleton';
  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      testID={containerTestID}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
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

      {/* shimmer 高光层：斜向白光带 translateX 扫过，覆盖三款变体之上 */}
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        testID={testID ? `${testID}-shimmer` : 'page-skeleton-shimmer'}
      >
        <Animated.View
          style={[styles.shimmerBand, { transform: [{ translateX: shimmerTranslate }] }]}
        >
          <LinearGradient
            colors={[
              colors['surface-container-lowest'],
              colors['surface-container-high'],
              colors['surface-container-lowest'],
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
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
  // shimmer 高光带：窄于容器（40% 宽），斜置增强流光质感
  shimmerBand: {
    width: '40%',
    height: '100%',
    transform: [{ rotate: '12deg' }],
  },
});
