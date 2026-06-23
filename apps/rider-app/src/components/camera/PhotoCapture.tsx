import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { AppIcon } from '../ui';

type PhotoCaptureProps = {
  captured: boolean;
  instruction: string;
  fileName: string;
  readyLabel: string;
  onCapture: (uri: string) => void;
  photoUri?: string;
  retakeLabel?: string;
  retakeConfirmTitle?: string;
  retakeConfirmMessage?: string;
  retakeConfirmCancel?: string;
  retakeConfirmOk?: string;
  onRetake?: () => void;
};

function PhotoCaptureNative({
  captured,
  instruction,
  fileName,
  readyLabel,
  onCapture,
  photoUri,
  retakeLabel,
  retakeConfirmTitle,
  retakeConfirmMessage,
  retakeConfirmCancel,
  retakeConfirmOk,
  onRetake,
}: PhotoCaptureProps) {
  const ImagePicker = require('expo-image-picker');
  const { Alert, Image, Pressable } = require('react-native');

  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();

  const takePhoto = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false });
    if (!result.canceled && result.assets[0]) onCapture(result.assets[0].uri);
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: false });
    if (!result.canceled && result.assets[0]) onCapture(result.assets[0].uri);
  };

  const handleRetakePress = () => {
    if (!onRetake) return;
    Alert.alert(
      retakeConfirmTitle ?? 'Retake photo',
      retakeConfirmMessage ?? 'Discard the current photo and capture a new one?',
      [
        { text: retakeConfirmCancel ?? 'Cancel', style: 'cancel' },
        { text: retakeConfirmOk ?? 'Retake', style: 'destructive', onPress: onRetake },
      ],
    );
  };

  return (
    <View className="w-full items-center gap-6">
      <View className="aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg border border-[#e1bfba] bg-[#eed4d1] shadow-inner">
        {captured && photoUri ? (
          <Image className="h-full w-full" resizeMode="cover" source={{ uri: photoUri }} />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <View className="h-3/5 w-4/5 items-center justify-center rounded-lg border-2 border-dashed border-white/70 bg-[#261816]/20">
              <AppIcon name="camera" className="text-5xl text-white/60" />
            </View>
            <Pressable className="absolute bottom-4 h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20" onPress={() => void takePhoto()}>
              <View className="h-12 w-12 rounded-full bg-white shadow-lg" />
            </Pressable>
          </View>
        )}
      </View>
      <View className="w-full max-w-sm gap-2">
        <View className="flex-row items-center gap-2 px-2">
          <Text className="text-sm text-[#8d706c]">i</Text>
          <Text className="flex-1 text-xs font-bold uppercase tracking-wider text-[#59413d]">{instruction}</Text>
        </View>
        {captured && photoUri ? (
          <View className="h-24 flex-row items-center gap-4 rounded-lg border border-dashed border-[#e1bfba] bg-[#f7ddd9] px-4">
            <View className="h-16 w-16 overflow-hidden rounded border border-[#8d706c] bg-[#eed4d1]">
              <Image className="h-full w-full" resizeMode="cover" source={{ uri: photoUri }} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#261816]">{fileName}</Text>
              <Text className="text-sm text-[#8d706c]">{readyLabel}</Text>
            </View>
            {onRetake ? (
              <Pressable
                accessibilityRole="button"
                className="rounded-full border border-[#e1bfba] bg-white px-3 py-1.5 active:opacity-70"
                onPress={handleRetakePress}
              >
                <Text className="text-xs font-bold uppercase tracking-wider text-[#720003]">{retakeLabel ?? 'Retake'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View className="flex-row gap-3">
            <Pressable className="flex-1 items-center rounded-lg bg-[#720003] py-3" onPress={() => void takePhoto()}>
              <Text className="text-xs font-bold text-white">CAMERA</Text>
            </Pressable>
            <Pressable className="flex-1 items-center rounded-lg border border-[#e1bfba] bg-white py-3" onPress={() => void pickFromGallery()}>
              <Text className="text-xs font-bold text-[#720003]">GALLERY</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function PhotoCaptureWeb({
  captured,
  instruction,
  fileName,
  readyLabel,
  onCapture,
  photoUri,
  retakeLabel,
  retakeConfirmTitle,
  retakeConfirmMessage,
  retakeConfirmCancel,
  retakeConfirmOk,
  onRetake,
}: PhotoCaptureProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onCapture(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <View className="w-full items-center gap-6">
      <View className="aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg border border-[#e1bfba] bg-[#eed4d1] shadow-inner">
        {captured && photoUri ? (
          <img src={photoUri} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <View className="h-3/5 w-4/5 items-center justify-center rounded-lg border-2 border-dashed border-white/70 bg-[#261816]/20">
              <AppIcon name="camera" className="text-5xl text-white/60" />
            </View>
            <Pressable
              className="absolute bottom-4 h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20"
              onPress={() => inputRef.current?.click()}
            >
              <View className="h-12 w-12 rounded-full bg-white shadow-lg" />
            </Pressable>
          </View>
        )}
      </View>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <View className="w-full max-w-sm gap-2">
        <View className="flex-row items-center gap-2 px-2">
          <Text className="text-sm text-[#8d706c]">i</Text>
          <Text className="flex-1 text-xs font-bold uppercase tracking-wider text-[#59413d]">{instruction}</Text>
        </View>
        {captured && photoUri ? (
          <View className="h-24 flex-row items-center gap-4 rounded-lg border border-dashed border-[#e1bfba] bg-[#f7ddd9] px-4">
            <View className="h-16 w-16 overflow-hidden rounded border border-[#8d706c] bg-[#eed4d1]">
              <img src={photoUri} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-[#261816]">{fileName}</Text>
              <Text className="text-sm text-[#8d706c]">{readyLabel}</Text>
            </View>
            {onRetake ? (
              <Pressable
                accessibilityRole="button"
                className="rounded-full border border-[#e1bfba] bg-white px-3 py-1.5 active:opacity-70"
                onPress={() => {
                  if (inputRef.current) inputRef.current.value = '';
                  onRetake();
                }}
              >
                <Text className="text-xs font-bold uppercase tracking-wider text-[#720003]">{retakeLabel ?? 'Retake'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View className="flex-row gap-3">
            <Pressable className="flex-1 items-center rounded-lg bg-[#720003] py-3" onPress={() => inputRef.current?.click()}>
              <Text className="text-xs font-bold text-white">CAMERA</Text>
            </Pressable>
            <Pressable
              className="flex-1 items-center rounded-lg border border-[#e1bfba] bg-white py-3"
              onPress={() => {
                const inp = inputRef.current;
                if (inp) { inp.removeAttribute('capture'); inp.click(); }
              }}
            >
              <Text className="text-xs font-bold text-[#720003]">GALLERY</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export function PhotoCapture(props: PhotoCaptureProps) {
  if (Platform.OS === 'web') return <PhotoCaptureWeb {...props} />;
  return <PhotoCaptureNative {...props} />;
}
