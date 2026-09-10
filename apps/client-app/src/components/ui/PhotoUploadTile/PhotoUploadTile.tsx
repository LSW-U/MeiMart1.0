/**
 * PhotoUploadTile — 统一图片上传位（upload 模块批B · U3 内联进度 + U4 失败重试，2026-09-09）
 *
 * 三态一空位：
 *   - 空位（无 state / state undefined）：虚线占位 + 添加按钮（点 onAdd 选图）
 *   - uploading：本地预览 + 半透明遮罩 + ActivityIndicator + 拟真进度百分比（U3 E1：不假死）
 *   - done：预览 + 右上角删除（onDelete）
 *   - error：保留本地预览（U4：失败不丢图）+ 错误码文案 + 重试（network）/ 删除（business 提示换一张）
 *
 * 尺寸/圆角与既有三页 photoThumb（72×72 / borderRadius.lg）一致，替换不破坏版式。
 * 复用点：after-sales-apply / review / feedback / profile-edit 4 调用点（批B 改动2）。
 */
import { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, borderRadius } from '@/theme';
import { Icon } from '@/components/ui/Icon';

import type { PhotoUploadTileProps } from './PhotoUploadTile.types';

export function PhotoUploadTile({
  state,
  uri,
  progress = 0,
  errorKind,
  errorCode,
  addLabel,
  addA11yLabel,
  retryA11yLabel,
  deleteA11yLabel,
  errorMessage,
  retryLabel,
  onAdd,
  onRetry,
  onDelete,
  disabled = false,
  size = 72,
  testID,
  removeTestID,
}: PhotoUploadTileProps) {
  const { colors } = useTheme();

  // error 态展示文案：调用方传入 errorMessage（已本地化）优先；否则用 errorCode 拼通用兜底
  // Why: 文案解析在页面层做（按 errors 命名空间 + code 拼 key），组件保持纯展示不依赖 i18n
  const resolvedError = useMemo(() => errorMessage, [errorMessage]);

  const boxStyle = {
    width: size,
    height: size,
    borderRadius: borderRadius.lg,
  };

  // ── 空位：添加按钮 ──
  if (!state) {
    return (
      <Pressable
        onPress={onAdd}
        disabled={disabled}
        style={({ pressed }) => [
          styles.addBox,
          boxStyle,
          {
            backgroundColor: colors['surface-container-low'],
            borderColor: colors['outline-variant'],
            opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={addA11yLabel}
        accessibilityState={{ disabled }}
        testID={testID}
      >
        <Icon symbol="photo_camera" size={22} color={colors['on-surface-variant']} />
        {addLabel !== undefined && (
          <Text style={[styles.addText, { color: colors['on-surface-variant'] }]}>{addLabel}</Text>
        )}
      </Pressable>
    );
  }

  // ── 三态图片位 ──
  return (
    <View style={[styles.box, boxStyle, { backgroundColor: colors['surface-container'] }]}>
      {uri ? <Image source={{ uri }} style={styles.img} resizeMode="cover" /> : null}

      {state === 'uploading' && (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
          <ActivityIndicator size="small" color="#ffffff" />
          <Text style={styles.progressText}>{`${Math.round(progress)}%`}</Text>
        </View>
      )}

      {state === 'error' && (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <Icon symbol="error_outline" size={18} color="#ffffff" />
          {resolvedError ? (
            <Text style={styles.errorText} numberOfLines={2}>
              {resolvedError}
            </Text>
          ) : null}
          {/* network 类失败 → 重试钮（U4 手动兜底）；business 类 → 仅删除（提示换一张，文案由页面层给） */}
          {errorKind === 'network' && onRetry && (
            <Pressable
              onPress={onRetry}
              style={styles.retryBtn}
              accessibilityRole="button"
              accessibilityLabel={retryA11yLabel ?? 'Retry'}
              testID={testID ? `${testID}-retry` : undefined}
            >
              {retryLabel ? (
                <Text style={styles.retryText}>{retryLabel}</Text>
              ) : (
                <Icon name="refresh" size={14} color="#ffffff" />
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* done / error 均可删除（error 删除 = 放弃这张） */}
      {state !== 'uploading' && onDelete && (
        <Pressable
          onPress={onDelete}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={deleteA11yLabel ?? 'Delete photo'}
          testID={removeTestID ?? (testID ? `${testID}-remove` : undefined)}
          hitSlop={8}
        >
          <Icon symbol="close" size={12} color="#ffffff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  addBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addText: {
    fontSize: 10,
  },
  box: {
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 4,
  },
  progressText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 9,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  retryText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
