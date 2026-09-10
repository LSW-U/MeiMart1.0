import type { TranslationKey } from '../../i18n/useTranslation';

import { Pressable, Text, View } from 'react-native';

import { AppIcon } from './AppIcon';

type UploadTileProps = {
  title: string;
  subtitle?: string;
  icon: string;
  selected: boolean;
  /** 上传中防重入（upload 模块批A）：disabled 时不可点，透明度降 */
  disabled?: boolean;
  /** 失败态（upload 模块批B · U4）：红边框 + 提示文案，再点即重试 */
  error?: boolean;
  /** 失败态提示文案（error=true 时渲染在 title 下方） */
  errorHint?: string;
  compact?: boolean;
  onPress: () => void;
  t: (key: TranslationKey) => string;
};

export function UploadTile({
  title,
  subtitle,
  icon,
  selected,
  disabled,
  error,
  errorHint,
  compact,
  onPress,
  t,
}: UploadTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled === true, busy: disabled === true }}
      className={`${compact ? 'h-24 flex-col justify-center gap-2' : 'min-h-14 flex-row justify-between'} items-center rounded-xl border p-4 ${error ? 'border-error bg-error/5' : selected ? 'border-primary bg-primary/5' : 'border-outline-variant bg-surface'} ${disabled ? 'opacity-60' : ''}`}
      disabled={disabled}
      onPress={onPress}
    >
      <View className={`${compact ? 'items-center' : 'flex-row items-center gap-3'}`}>
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-surface-container">
          <Text className="text-xl text-primary">{icon}</Text>
        </View>
        <View className={compact ? 'items-center' : ''}>
          {/* P3-2（批B 修复）：disabled=上传中时 title 换成 common.uploading（消费批A 预留 key） */}
          <Text className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            {disabled ? t('common.uploading') : title}
          </Text>
          {error && errorHint ? (
            <Text className="text-xs font-semibold text-error" numberOfLines={2}>
              {errorHint}
            </Text>
          ) : subtitle ? (
            <Text
              className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-on-surface'}`}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {/* B7: 选中态 ✓ → AppIcon；失败态显示「重试」文案（U4 手动兜底，再点重新选图上传）；
          未选中态是 i18n 文案（拍照/CAM）保留 Text */}
      {!compact ? (
        error ? (
          <Text className="text-sm font-bold text-error">{t('common.retry')}</Text>
        ) : selected ? (
          <AppIcon className="text-xl text-primary" name="check" size={22} />
        ) : (
          <Text className="text-xl text-outline">{t('auth.register.cam')}</Text>
        )
      ) : null}
    </Pressable>
  );
}
