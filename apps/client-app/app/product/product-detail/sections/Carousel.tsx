// 图片轮播（D-V4：对齐 P1 优化原型 slide 380px 满屏宽 + 分页圆点）
// 批5 拆分：从 app/product/[id].tsx 原样搬移，行为零变更
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing } from '@/theme';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { SCREEN_WIDTH, CAROUSEL_HEIGHT } from '../shared';

export function Carousel({
  images,
  activeImage,
  onImageIndexChange,
}: {
  images: string[];
  activeImage: number;
  onImageIndexChange: (idx: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.carousel, { backgroundColor: colors['surface-variant'], paddingTop: 0 }]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          if (idx !== activeImage) onImageIndexChange(idx);
        }}
        scrollEventThrottle={16}
      >
        {/* D1 批D：真实多图轮播（images[]，mainImage 首图兜底）——替换假三图（同图×3 + 计数器 /3 硬编码）
            批2：详情大图走原图（variant=full，600px 缩略图会糊），activeImage 首屏 priority 高 */}
        {images.map((uri, i) => (
          <SafeImage
            key={i}
            source={{ uri }}
            style={{ width: SCREEN_WIDTH, height: CAROUSEL_HEIGHT }}
            resizeMode="cover"
            recyclingKey={`${uri}-${i}`}
            lazy={i !== activeImage}
          />
        ))}
      </ScrollView>
      {/* Pagination Dots（单图无可分页，不渲染） */}
      {images.length > 1 && (
        <View style={styles.dotsWrap}>
          {images.map((_, n) => (
            <View
              key={n}
              style={[
                styles.dot,
                n === activeImage
                  ? [styles.dotActive, { backgroundColor: colors.primary }]
                  : styles.dotIdle,
              ]}
            />
          ))}
        </View>
      )}
      {/* U5: 图片计数器 右下角（替原 play 按钮居中占位）——分母真实 = images 数，单图隐藏 */}
      {images.length > 1 && (
        <View style={styles.imageCounter} pointerEvents="none">
          <Text style={styles.imageCounterText}>
            {Math.min(activeImage + 1, images.length)}/{images.length}
          </Text>
        </View>
      )}
      {/* P1-26：装饰性 play 按钮已删——pointerEvents="none" 不可点却可见，违反「可见即可点」；
          视频上线后恢复并补 onPress + a11y（原 playWrap/playBtn 样式见 git 历史） */}
    </View>
  );
}

const styles = StyleSheet.create({
  carousel: {
    position: 'relative',
  },
  dotsWrap: {
    position: 'absolute',
    // D-V4：原型 .carousel .dots bottom:12px
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    // D-V4：原型 dots gap:6px
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  dotActive: {
    // D-V4：原型 .dot.active width:18px
    width: 18,
  },
  dotIdle: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  imageCounter: {
    position: 'absolute',
    // D-V4：原型 .carousel .img-count bottom:12px right:12px
    bottom: 12,
    right: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  imageCounterText: {
    // 原因：图片计数器黑底(rgba(0,0,0,0.5))白字，固定对比色，dark 不变
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
