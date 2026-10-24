/**
 * SafeImage - 带加载失败兜底 + 缓存 + 缩略图 variant 的 Image 组件（轻量化省流批2 升级）
 *
 * Why: 用 expo-image 替代 react-native Image，自带内存+磁盘缓存
 * 统一封装：加载失败显示占位（灰底 + image-off 图标），防局部空白
 *
 * 用法：
 *   <SafeImage source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
 *   <SafeImage source={{ uri: product.image }} variant="thumb" recyclingKey={product.id} />
 *
 * 缓存：expo-image 默认 cachePolicy="memory-disk"，二次加载秒开
 *
 * 批2 升级（方案v2-轻量化省流模块-20261024 D2/D2b）：
 *   - variant="thumb"：拼 `-thumb` 后缀 URL 命中服务端 600px 缩略图（批1 已落地），
 *     缩略图加载失败自动回退原图（后端缺 -thumb 对象/旧图未回填场景），
 *     原图也失败才进占位态。唯一真省下载字节的环节在服务端缩略图（D2 订正：
 *     客户端组件压缩不了流量），本组件只负责选对 URL。
 *   - recyclingKey / priority 透传 expo-image（列表复用省内存 + 加载排队优先级）。
 *   - lazy：列表场景懒加载默认策略。⚠️ expo-image 的 loading='lazy' 是 web-only
 *     （native 无 viewport 概念），native 侧落地为 priority='low'（排队让位首屏），
 *     行为差异上报不硬设（方案v2 §六）。
 */
import { useState, type ReactNode } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { View, StyleSheet, type ImageStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

type ContentFit = 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';

/**
 * 拼 `-thumb` 缩略图 URL（与服务端 thumbKeyFor 同规则：最后一个 '.' 前插入，
 * 无扩展名则尾部追加）。非 http(s) 本地 URI（file:// 相机预览等）原样返回——
 * 缩略图只对 MinIO 服务端对象有意义。
 * P3-2（批2 审查）：仅图片扩展名（jpe?g/png/webp）才拼 -thumb——外链兜底图
 * （如 unsplash 无扩展名/带 query）拼 -thumb 必 404 白耗一次请求，不命中直接走 full。
 */
const IMAGE_EXT_RE = /\.(jpe?g|png|webp)$/i;

export function toThumbUrl(uri: string): string {
  if (!/^https?:\/\//i.test(uri)) return uri;
  if (!IMAGE_EXT_RE.test(uri)) return uri;
  const dot = uri.lastIndexOf('.');
  const slash = uri.lastIndexOf('/');
  // 点在最后一段路径里才算扩展名（命中上面的图片扩展名正则，query/hash 场景从简：
  // MinIO 裸直链无 query；带 query 的外链不命中正则直接走 full）
  if (dot <= slash) return `${uri}-thumb`;
  return `${uri.slice(0, dot)}-thumb${uri.slice(dot)}`;
}

interface SafeImageProps {
  /** 图片源（{ uri } 或 URL 字符串） */
  source: { uri: string } | string;
  /**
   * thumb = 加载服务端 600px 缩略图（-thumb URL，失败回退原图）
   * full = 原图（默认，兼容既有调用）
   */
  variant?: 'thumb' | 'full';
  /** 样式 */
  style?: ImageStyle | ImageStyle[];
  /** 缩放模式，对应 expo-image contentFit，默认 cover */
  resizeMode?: ContentFit;
  /** 加载失败时的自定义占位 */
  fallback?: ReactNode;
  /** 渐变过渡时长（ms），0 关闭 */
  transition?: number;
  /** expo-image recyclingKey 透传（列表复用回收，防内存膨胀） */
  recyclingKey?: string;
  /** expo-image 加载优先级透传（默认 normal） */
  priority?: 'low' | 'normal' | 'high';
  /**
   * 列表场景懒加载：native → priority='low'；web → loading='lazy'（native 无此 prop）。
   * 默认 false（首屏/hero 图不降优先级）。
   */
  lazy?: boolean;
  /** expo-image onError 透传（调用方自有错误兜底，如 CategoryItem 图标降级；不被组件吞掉） */
  onError?: (e: { nativeEvent?: { error?: string | unknown } }) => void;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
}

export function SafeImage({
  fallback,
  style,
  resizeMode = 'cover',
  source,
  transition = 300,
  variant = 'full',
  recyclingKey,
  priority,
  lazy = false,
  onError: callerOnError,
  ...rest
}: SafeImageProps) {
  const { colors } = useTheme();
  const [hasError, setHasError] = useState(false);
  // thumb → 原图回退状态：thumb 加载失败先退原图重试，原图也失败才 hasError
  const [fellBackToFull, setFellBackToFull] = useState(false);
  // C-P2-3: 同实例换图（列表复用/轮播切换）必须重置 hasError——否则上一张图的失败状态
  // 会卡在新图上永远显示占位。React 官方「prop 变化时调整 state」模式（渲染期 setState，
  // 提交前立即重渲，无级联；useEffect 会撞 react-hooks/set-state-in-effect，product/[id].tsx:148 同款先例）。
  const [prevUri, setPrevUri] = useState(typeof source === 'string' ? source : source.uri);
  const originalUri = typeof source === 'string' ? source : source.uri;
  if (prevUri !== originalUri) {
    setPrevUri(originalUri);
    setHasError(false);
    setFellBackToFull(false);
  }

  const displayUri = variant === 'thumb' && !fellBackToFull ? toThumbUrl(originalUri) : originalUri;

  if (hasError) {
    return (
      <View style={[styles.fallback, style, { backgroundColor: colors['surface-container-low'] }]}>
        {fallback ?? (
          <MaterialCommunityIcons
            name="image-off-outline"
            size={24}
            color={colors['on-surface-variant']}
          />
        )}
      </View>
    );
  }

  return (
    <ExpoImage
      source={{ uri: displayUri }}
      style={style}
      contentFit={resizeMode}
      cachePolicy="memory-disk"
      transition={transition}
      recyclingKey={recyclingKey}
      priority={priority ?? (lazy ? 'low' : undefined)}
      // loading='lazy' web-only（native 传了无效果也无害，类型上 expo-image 全平台同型）
      loading={lazy ? 'lazy' : undefined}
      {...rest}
      onError={(e) => {
        // thumb 失败 → 回退原图再试一次（旧图未回填 -thumb 的兜底）
        if (variant === 'thumb' && !fellBackToFull && displayUri !== originalUri) {
          setFellBackToFull(true);
          return;
        }
        setHasError(true);
        // 调用方自有 onError（如 CategoryItem 图标兜底）不被吞
        (callerOnError as ((e: unknown) => void) | undefined)?.(e);
      }}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
