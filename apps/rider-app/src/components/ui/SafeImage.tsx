/**
 * SafeImage — rider-app 图片封装（轻量化省流批2 D7，与 client-app 同语义）
 *
 * Why: 骑手端裸 react-native Image 收编；expo-image 自带内存+磁盘双缓存，
 *      失败兜底占位防局部空白。缩略图 variant 与 client-app SafeImage 同规则
 *      （`-thumb` 后缀 URL，服务端批1 sharp 已生成；失败回退原图）。
 *      rider-app 无 ThemeProvider hook（主题走 src/theme/colors 常量），占位底色用 colors.surface。
 *
 * 用法：
 *   <SafeImage source={{ uri: rider.avatarUrl }} className="h-full w-full rounded-full" resizeMode="cover" />
 */
import { useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { View, type StyleProp, type ImageStyle } from 'react-native';
import { colors } from '../../theme/colors';

type ContentFit = 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';

/**
 * 拼 `-thumb` 缩略图 URL（同 client-app toThumbUrl 规则；非 http(s) 本地 URI 原样返回）。
 * 批3（对齐 client P3-2）：仅图片扩展名（jpe?g/png/webp）才拼 -thumb——外链兜底图
 * （无扩展名/带 query/非图片扩展名）拼 -thumb 必 404 白耗一次请求，不命中直接走 full。
 */
const IMAGE_EXT_RE = /\.(jpe?g|png|webp)$/i;

export function toThumbUrl(uri: string): string {
  if (!/^https?:\/\//i.test(uri)) return uri;
  if (!IMAGE_EXT_RE.test(uri)) return uri;
  const dot = uri.lastIndexOf('.');
  const slash = uri.lastIndexOf('/');
  if (dot <= slash) return `${uri}-thumb`;
  return `${uri.slice(0, dot)}-thumb${uri.slice(dot)}`;
}

interface SafeImageProps {
  source: { uri: string };
  /** thumb = 服务端 600px 缩略图（失败回退原图）；full = 原图（默认） */
  variant?: 'thumb' | 'full';
  style?: StyleProp<ImageStyle>;
  /** nativewind className（tailwind 类，对齐 rider-app 既有写法） */
  className?: string;
  resizeMode?: ContentFit;
  /** 失败占位底色下的自定义子节点（默认空 View） */
  fallback?: React.ReactNode;
  recyclingKey?: string;
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
}

export function SafeImage({
  source,
  variant = 'full',
  style,
  className,
  resizeMode = 'cover',
  fallback,
  recyclingKey,
  testID,
  ...rest
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  // thumb → 原图回退状态：thumb 加载失败先退原图重试，原图也失败才 hasError
  const [fellBackToFull, setFellBackToFull] = useState(false);
  // P3-1（批2 审查，对齐 client C-P2-3）：同实例换图（列表复用/换头像/EvidenceUpload 换照）
  // 必须重置 hasError/fellBackToFull——否则上一张图的失败状态卡在新图上永远占位。
  // 渲染期 setState（React 官方「prop 变化时调整 state」模式，提交前立即重渲，无 useEffect 级联）
  const [prevUri, setPrevUri] = useState(source.uri);
  const originalUri = source.uri;
  if (prevUri !== originalUri) {
    setPrevUri(originalUri);
    setHasError(false);
    setFellBackToFull(false);
  }

  const displayUri = variant === 'thumb' && !fellBackToFull ? toThumbUrl(originalUri) : originalUri;

  if (hasError) {
    return (
      <View style={[styles.fallback, style]} className={className} testID={testID}>
        {fallback}
      </View>
    );
  }

  return (
    <ExpoImage
      source={{ uri: displayUri }}
      style={style}
      className={className}
      contentFit={resizeMode}
      cachePolicy="memory-disk"
      recyclingKey={recyclingKey}
      testID={testID}
      onError={() => {
        // thumb 失败 → 回退原图再试一次；原图也失败 → 占位
        if (variant === 'thumb' && !fellBackToFull && displayUri !== originalUri) {
          setFellBackToFull(true);
          return;
        }
        setHasError(true);
      }}
      {...rest}
    />
  );
}

// Why 不用 StyleSheet.create：仅一条 fallback 样式，且 web 测试工程（jsdom）的
// react-native host 壳（src/test/react-native.mock.js）不导出 StyleSheet——
// 纯对象样式零依赖，原生/测试两侧行为一致
const styles = {
  fallback: {
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
