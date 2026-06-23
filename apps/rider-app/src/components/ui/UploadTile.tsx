import type { TranslationKey } from '../../i18n/useTranslation';

type UploadTileProps = {
  title: string;
  subtitle?: string;
  icon: string;
  selected: boolean;
  compact?: boolean;
  onPress: () => void;
  t: (key: TranslationKey) => string;
};

import { Pressable, Text, View } from 'react-native';

export function UploadTile({ title, subtitle, icon, selected, compact, onPress, t }: UploadTileProps) {
  return (
    <Pressable
      className={`${compact ? 'h-24 flex-col justify-center gap-2' : 'min-h-14 flex-row justify-between'} items-center rounded-xl border p-4 ${selected ? 'border-[#720003] bg-[#720003]/5' : 'border-[#e1bfba] bg-white'}`}
      onPress={onPress}
    >
      <View className={`${compact ? 'items-center' : 'flex-row items-center gap-3'}`}>
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-[#ffe9e6]">
          <Text className="text-xl text-[#720003]">{icon}</Text>
        </View>
        <View className={compact ? 'items-center' : ''}>
          <Text className="text-[10px] font-bold uppercase tracking-wider text-[#59413d]">{title}</Text>
          {subtitle ? <Text className={`text-sm font-semibold ${selected ? 'text-[#720003]' : 'text-[#261816]'}`}>{subtitle}</Text> : null}
        </View>
      </View>
      {!compact ? <Text className={`text-xl ${selected ? 'text-[#720003]' : 'text-[#8d706c]'}`}>{selected ? '✓' : t('auth.register.cam')}</Text> : null}
    </Pressable>
  );
}
