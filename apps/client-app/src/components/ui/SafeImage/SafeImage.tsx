/**
 * SafeImage - 带加载失败兜底 + 缓存的 Image 组件
 *
 * Why: 用 expo-image 替代 react-native Image，自带内存+磁盘缓存
 * 统一封装：加载失败显示占位（灰底 + image-off 图标），防局部空白
 *
 * 用法：
 *   <SafeImage source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
 *
 * 缓存：expo-image 默认 cachePolicy="memory-disk"，二次加载秒开
 */
import { useState, type ReactNode } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { View, StyleSheet, type ImageStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ContentFit = 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';

interface SafeImageProps {
  /** 图片源（{ uri } 或 URL 字符串） */
  source: { uri: string } | string;
  /** 样式 */
  style?: ImageStyle | ImageStyle[];
  /** 缩放模式，对应 expo-image contentFit，默认 cover */
  resizeMode?: ContentFit;
  /** 加载失败时的自定义占位 */
  fallback?: ReactNode;
  /** 渐变过渡时长（ms），0 关闭 */
  transition?: number;
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
  ...rest
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <View style={[styles.fallback, style]}>
        {fallback ?? (
          <MaterialCommunityIcons name="image-off-outline" size={24} color="#bdbdbd" />
        )}
      </View>
    );
  }

  return (
    <ExpoImage
      source={source}
      style={style}
      contentFit={resizeMode}
      cachePolicy="memory-disk"
      transition={transition}
      onError={() => setHasError(true)}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
});
