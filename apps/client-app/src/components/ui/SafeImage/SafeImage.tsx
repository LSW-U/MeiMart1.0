/**
 * SafeImage - 带加载失败兜底的 Image 组件
 *
 * Why: 18 个 <Image> 中 16 个无 onError，图片 URL 失效/网络错误时显示空白
 * 统一封装：加载失败显示占位（灰底 + image 图标），防局部空白影响布局
 *
 * 用法：
 *   <SafeImage source={{ uri: product.image }} style={styles.image} />
 *   <SafeImage source={...} fallback={<CustomPlaceholder />} />
 */
import { useState, type ReactNode } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ImageProps } from 'react-native';

interface SafeImageProps extends ImageProps {
  /** 加载失败时的自定义占位，默认灰底 + image 图标 */
  fallback?: ReactNode;
}

export function SafeImage({ fallback, style, onError, ...rest }: SafeImageProps) {
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
    <Image
      style={style}
      onError={(e) => {
        setHasError(true);
        onError?.(e);
      }}
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
