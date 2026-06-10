import '../global.css';

import { Stack } from 'expo-router';
import { StyleSheet } from 'nativewind';
import { StatusBar } from 'expo-status-bar';

const nativeWindStyleSheet = StyleSheet as typeof StyleSheet & {
  setFlag(name: string, value: string): void;
};

nativeWindStyleSheet.setFlag('darkMode', 'class');

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
