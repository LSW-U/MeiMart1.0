import { Pressable, Text, View } from 'react-native';

type QrScannerProps = {
  onScan?: (value: string) => void;
};

export function QrScanner({ onScan }: QrScannerProps) {
  return (
    <View className="items-center rounded-3xl border border-dashed border-[#720003] bg-white p-6">
      <Text className="text-lg font-bold text-[#261816]">QR Scanner</Text>
      <Text className="mt-2 text-center text-sm text-[#59413d]">Camera integration placeholder</Text>
      <Pressable className="mt-5 rounded-full bg-[#720003] px-5 py-3" onPress={() => onScan?.('DEMO-CODE')}>
        <Text className="font-semibold text-white">Simulate scan</Text>
      </Pressable>
    </View>
  );
}
