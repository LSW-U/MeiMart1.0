import type { TranslationKey } from '../../i18n/useTranslation';

import { Pressable, Text, View } from 'react-native';

type UploadTileProps = {
  title: string;
  subtitle?: string;
  icon: string;
  selected: boolean;
  compact?: boolean;
  onPress: () => void;
  t: (key: TranslationKey) => string;
};

export function UploadTile({ title, subtitle, icon, selected, compact, onPress, t }: UploadTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      className={`${compact ? 'h-24 flex-col justify-center gap-2' : 'min-h-14 flex-row justify-between'} items-center rounded-xl border p-4 ${selected ? 'border-primary bg-primary/5' : 'border-outline-variant bg-white'}`}
      onPress={onPress}
    >
      <View className={`${compact ? 'items-center' : 'flex-row items-center gap-3'}`}>
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-surface-container">
          <Text className="text-xl text-primary">{icon}</Text>
        </View>
        <View className={compact ? 'items-center' : ''}>
          <Text className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{title}</Text>
          {subtitle ? <Text className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-on-surface'}`}>{subtitle}</Text> : null}
        </View>
      </View>
      {!compact ? <Text className={`text-xl ${selected ? 'text-primary' : 'text-outline'}`}>{selected ? '✓' : t('auth.register.cam')}</Text> : null}
    </Pressable>
  );
}
