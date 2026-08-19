import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { AppIcon } from '../ui/AppIcon';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n/useTranslation';

type EvidenceExampleType = 'door' | 'package';

type EvidenceExampleProps = {
  label: string;
  /** T5 §3.2/L5：外链示例图换本地图标占位（离线不裂图）。door→门牌、package→包裹 */
  type: EvidenceExampleType;
};

/**
 * T5 §3.2/L5：示例图从 googleusercontent 外链改为本地图标占位。
 * 外链离线/链路失效会裂图，骑手无法判断是加载中还是失败；本地图标零依赖、离线可用。
 */
export function EvidenceExample({ label, type }: EvidenceExampleProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-1">
      <View className="aspect-square items-center justify-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-low">
        <AppIcon color={colors.outline} name={type === 'door' ? 'dropoff' : 'orders'} size={28} />
        <Text className="text-[9px] font-semibold uppercase tracking-wider text-on-surface-variant">
          {type === 'door' ? t('sign.doorExample') : t('sign.packageExample')}
        </Text>
      </View>
      <Text className="text-center text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</Text>
    </View>
  );
}

type EvidenceUploadProps = {
  title: string;
  actionLabel: string;
  capturedLabel: string;
  /** T5 §3.3 B：占位文字（替代写死的英文「CAM」）。默认 'CAM' 兼容其他调用方 */
  placeholderLabel?: string;
  required?: boolean;
  captured: boolean;
  photoUri?: string;
  onPress: (uri: string) => void;
  // T3 §3.6/§3.5.2: 权限拒绝不再静默 return（骑手以为按钮坏了），由调用方传 toast
  onPermissionDenied?: () => void;
  // T3 §3.5.3: launchCameraAsync 异常（设备无相机/存储满）不裸抛未捕获 rejection
  onError?: () => void;
};

function EvidenceUploadNative({ title, actionLabel, capturedLabel, placeholderLabel = 'CAM', required = false, captured, photoUri, onPress, onPermissionDenied, onError }: EvidenceUploadProps) {
  const ImagePicker = require('expo-image-picker');
  const { Image, Pressable } = require('react-native');

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        onPermissionDenied?.();
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets[0]) onPress(result.assets[0].uri);
    } catch {
      onError?.();
    }
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-1">
        <Text className="text-xl font-semibold text-on-surface">{title}</Text>
        {required ? <Text className="font-bold text-primary">*</Text> : null}
      </View>
      <Pressable
        className={`aspect-[16/9] items-center justify-center rounded-lg border-2 border-dashed overflow-hidden ${captured ? 'border-tertiary-container bg-tier-gold-soft/20' : 'border-outline bg-surface'}`}
        onPress={() => void takePhoto()}
      >
        {captured && photoUri ? (
          <Image className="h-full w-full" resizeMode="cover" source={{ uri: photoUri }} />
        ) : (
          <>
            <Text className="mb-1 text-4xl text-outline">{placeholderLabel}</Text>
            <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{actionLabel}</Text>
          </>
        )}
      </Pressable>
      {captured && (
        <Text className="text-center text-xs font-bold text-tertiary-container">{capturedLabel}</Text>
      )}
    </View>
  );
}

function EvidenceUploadWeb({ title, actionLabel, capturedLabel, placeholderLabel = 'CAM', required = false, captured, photoUri, onPress, onError }: EvidenceUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onPress(reader.result);
    };
    reader.onerror = () => {
      // Web 文件读取失败兜底（对称 Native onError 治理）
      onError?.();
    };
    reader.readAsDataURL(file);
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-1">
        <Text className="text-xl font-semibold text-on-surface">{title}</Text>
        {required ? <Text className="font-bold text-primary">*</Text> : null}
      </View>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <Pressable
        className={`aspect-[16/9] items-center justify-center rounded-lg border-2 border-dashed overflow-hidden ${captured ? 'border-tertiary-container bg-tier-gold-soft/20' : 'border-outline bg-surface'}`}
        onPress={() => inputRef.current?.click()}
      >
        {captured && photoUri ? (
          <img src={photoUri} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            <Text className="mb-1 text-4xl text-outline">{placeholderLabel}</Text>
            <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{actionLabel}</Text>
          </>
        )}
      </Pressable>
      {captured && (
        <Text className="text-center text-xs font-bold text-tertiary-container">{capturedLabel}</Text>
      )}
    </View>
  );
}

export function EvidenceUpload(props: EvidenceUploadProps) {
  if (Platform.OS === 'web') return <EvidenceUploadWeb {...props} />;
  return <EvidenceUploadNative {...props} />;
}
