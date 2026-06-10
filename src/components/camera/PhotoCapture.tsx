import { ImageBackground, Pressable, Text, View } from 'react-native';

import { AppIcon } from '../ui';

const receiptUri = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCsnGxXF2l-3IqYly4Ii_dV8qTYIrsC7K65uKkFQTIXXkHXnD5ZaJfZfov3-3SyGlvIcTZR1l58hBiYaFZQy_nU50Uz7aPjz19dK5KmNkYZ7iJmlqqLd44um1R0-KQq7a8jEnbWHgspgdxaDItQAcA2gi09DUXz2FtpU6JY-d_TA2VJyvRLfux82Oo6WPws-InJQ2TliYc9ZhEY71ham3Fr-AYPoGEm3DTqvPq8iMqWdm6akzYcE5iVR6WsooRw8XknzmyqvZw-ew';

type PhotoCaptureProps = {
  captured: boolean;
  instruction: string;
  fileName: string;
  readyLabel: string;
  onCapture: () => void;
};

export function PhotoCapture({ captured, instruction, fileName, readyLabel, onCapture }: PhotoCaptureProps) {
  return (
    <View className="w-full items-center gap-6">
      <View className="aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg border border-[#e1bfba] bg-[#eed4d1] shadow-inner">
        <ImageBackground className="h-full w-full items-center justify-center opacity-80" resizeMode="cover" source={{ uri: receiptUri }}>
          <View className="h-3/5 w-4/5 items-center justify-center rounded-lg border-2 border-dashed border-white/70 bg-[#261816]/20">
            <AppIcon name="camera" className="text-5xl text-white/60" />
          </View>
          <Pressable className="absolute bottom-4 h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20" onPress={onCapture}>
            <View className="h-12 w-12 rounded-full bg-white shadow-lg" />
          </Pressable>
        </ImageBackground>
      </View>
      <View className="w-full max-w-sm gap-2">
        <View className="flex-row items-center gap-2 px-2">
          <Text className="text-sm text-[#8d706c]">i</Text>
          <Text className="flex-1 text-xs font-bold uppercase tracking-wider text-[#59413d]">{instruction}</Text>
        </View>
        {captured ? (
          <View className="h-24 flex-row items-center gap-4 rounded-lg border border-dashed border-[#e1bfba] bg-[#f7ddd9] px-4">
            <View className="h-16 w-16 items-center justify-center rounded border border-[#8d706c] bg-[#eed4d1]">
              <Text className="text-[#720003]">IMG</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#261816]">{fileName}</Text>
              <Text className="text-sm text-[#8d706c]">{readyLabel}</Text>
            </View>
            <Text className="text-[#720003]">DEL</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
