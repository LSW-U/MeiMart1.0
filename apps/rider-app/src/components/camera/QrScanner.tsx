import { Platform, Text, View } from 'react-native';

type QrScannerProps = {
  onScan?: (value: string) => void;
};

function QrScannerNative({ onScan }: QrScannerProps) {
  const { useState } = require('react');
  const { CameraView, BarcodeScanningResult, useCameraPermissions } = require('expo-camera');

  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [requested, setRequested] = useState(false);

  const handleRequest = async () => {
    await requestPermission();
    setRequested(true);
  };

  if (!permission?.granted && !requested) {
    return (
      <View className="items-center rounded-3xl border border-dashed border-[#720003] bg-white p-6">
        <Text className="text-lg font-bold text-[#261816]">QR Scanner</Text>
        <Text className="mt-2 text-center text-sm text-[#59413d]">Camera permission is required to scan QR codes.</Text>
        <Text className="mt-4 rounded-full bg-[#720003] px-5 py-3 font-semibold text-white" onPress={() => void handleRequest()}>
          Grant Permission
        </Text>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View className="items-center rounded-3xl border border-dashed border-[#720003] bg-white p-6">
        <Text className="text-lg font-bold text-[#261816]">QR Scanner</Text>
        <Text className="mt-2 text-center text-sm text-[#59413d]">Camera permission denied. Please enable it in Settings.</Text>
      </View>
    );
  }

  const handleBarcodeScanned = (result: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan?.(result.data);
    setTimeout(() => setScanned(false), 2000);
  };

  return (
    <View className="h-64 w-full overflow-hidden rounded-3xl">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />
      <View className="absolute bottom-3 left-0 right-0 items-center">
        <Text className="rounded-full bg-black/60 px-4 py-2 text-xs font-bold text-white">
          {scanned ? 'Scanned!' : 'Point camera at QR code'}
        </Text>
      </View>
    </View>
  );
}

function QrScannerPlaceholder() {
  return (
    <View className="items-center rounded-3xl border border-dashed border-[#720003] bg-white p-6">
      <Text className="text-4xl text-[#720003]/40">QR</Text>
      <Text className="mt-2 text-xs font-bold uppercase tracking-wider text-[#59413d]">QR Scanner</Text>
      <Text className="mt-1 text-[10px] text-[#8d706c]">Available on iOS / Android</Text>
    </View>
  );
}

export function QrScanner(props: QrScannerProps) {
  if (Platform.OS === 'web') return <QrScannerPlaceholder />;
  return <QrScannerNative {...props} />;
}
