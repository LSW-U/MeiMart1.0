import * as ImagePicker from 'expo-image-picker';
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
  photoUri?: string;
  onPress: (uri: string) => void;
};

export function EvidenceUpload({ title, actionLabel, capturedLabel, required = false, captured, photoUri, onPress }: EvidenceUploadProps) {
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onPress(result.assets[0].uri);
    }
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-1">
        <Text className="text-xl font-semibold text-[#261816]">{title}</Text>
        {required ? <Text className="font-bold text-[#720003]">*</Text> : null}
      </View>
      <Pressable
        className={`aspect-[16/9] items-center justify-center rounded-lg border-2 border-dashed overflow-hidden ${captured ? 'border-[#634700] bg-[#ffdea3]/20' : 'border-[#8d706c] bg-white'}`}
        onPress={() => void takePhoto()}
      >
        {captured && photoUri ? (
          <Image className="h-full w-full" resizeMode="cover" source={{ uri: photoUri }} />
        ) : (
          <>
            <Text className="mb-1 text-4xl text-[#8d706c]">CAM</Text>
            <Text className="text-xs font-bold uppercase tracking-wider text-[#59413d]">{actionLabel}</Text>
          </>
        )}
      </Pressable>
      {captured && (
        <Text className="text-center text-xs font-bold text-[#634700]">{capturedLabel}</Text>
      )}
    </View>
  );
}
