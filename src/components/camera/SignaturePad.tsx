import { Platform, Text, View } from 'react-native';

type EvidenceExampleProps = {
  label: string;
  uri: string;
};

export function EvidenceExample({ label, uri }: EvidenceExampleProps) {
  const { Image } = require('react-native');
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

function EvidenceUploadNative({ title, actionLabel, capturedLabel, required = false, captured, photoUri, onPress }: EvidenceUploadProps) {
  const ImagePicker = require('expo-image-picker');
  const { Image, Pressable } = require('react-native');

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) onPress(result.assets[0].uri);
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

function EvidenceUploadPlaceholder({ title, actionLabel, required = false, captured, capturedLabel }: EvidenceUploadProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-1">
        <Text className="text-xl font-semibold text-[#261816]">{title}</Text>
        {required ? <Text className="font-bold text-[#720003]">*</Text> : null}
      </View>
      <View className="aspect-[16/9] items-center justify-center rounded-lg border-2 border-dashed border-[#8d706c] bg-[#eed4d1]">
        <Text className="text-xs font-bold uppercase tracking-wider text-[#59413d]">Camera not available on Web</Text>
      </View>
      {captured && (
        <Text className="text-center text-xs font-bold text-[#634700]">{capturedLabel}</Text>
      )}
    </View>
  );
}

export function EvidenceUpload(props: EvidenceUploadProps) {
  if (Platform.OS === 'web') return <EvidenceUploadPlaceholder {...props} />;
  return <EvidenceUploadNative {...props} />;
}
