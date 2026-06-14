import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme, spacing } from '@/theme';
import { LogoBadge } from '@/components/cultural/LogoBadge';
import { DiamondPattern } from '@/components/cultural/DiamondPattern';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function SplashPage() {
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);

  useEffect(() => {
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      if (!onboardingCompleted) {
        router.replace('/onboarding');
      } else if (!isAuthenticated) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(main)/home');
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [isAuthenticated, onboardingCompleted]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      accessibilityLabel="MeiMart Splash Screen"
      accessibilityRole="image"
    >
      <DiamondPattern />
      <View style={styles.content}>
        <LogoBadge size={96} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: {
    zIndex: 10,
    alignItems: 'center',
  },
});
