import { Image, Pressable, Text, View } from 'react-native';

type EvidenceExampleProps = {
  label: string;
  uri: string;
};

export function EvidenceExample({ label, uri }: EvidenceExampleProps) {
  return (
    <View className="gap-1">
      <View className="aspect-square overflow-hidden rounded-lg border border-[#e1bfba] bg-[#fff0ee]">
        <Image className="h-full w-full" resizeMode="cover" source={{ uri }} />
      </View>
      <Text className="text-center text-[10px] font-bold uppercase tracking-wider text-[#59413d]">{label}</Text>
    </View>
  );
}

type EvidenceUploadProps = {
  title: string;
  actionLabel: string;
  capturedLabel: string;
  required?: boolean;
  captured: boolean;
  onPress: () => void;
};

export function EvidenceUpload({ title, actionLabel, capturedLabel, required = false, captured, onPress }: EvidenceUploadProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-1">
        <Text className="text-xl font-semibold text-[#261816]">{title}</Text>
        {required ? <Text className="font-bold text-[#720003]">*</Text> : null}
      </View>
      <Pressable
        className={`aspect-[16/9] items-center justify-center rounded-lg border-2 border-dashed ${captured ? 'border-[#634700] bg-[#ffdea3]/20' : 'border-[#8d706c] bg-white'}`}
        onPress={onPress}
      >
        <Text className={`mb-1 text-4xl ${captured ? 'text-[#634700]' : 'text-[#8d706c]'}`}>{captured ? 'OK' : 'CAM'}</Text>
        <Text className={`text-xs font-bold uppercase tracking-wider ${captured ? 'text-[#634700]' : 'text-[#59413d]'}`}>{captured ? capturedLabel : actionLabel}</Text>
      </Pressable>
    </View>
  );
}
