import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '../../src/store/useAuthStore';

export default function MainLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Why: 等 hydrate 完成，避免未登录用户看到任务页内容
  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#720003" />
      </View>
    );
  }

  // Why: 未登录（token 失效/角色不匹配被清除）-> 跳登录页
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
