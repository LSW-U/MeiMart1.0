import { useState } from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { Button } from '@/components/ui/Button';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { useAppStore } from '@/store/appStore';

interface Slide {
  id: string;
  image: string;
  titleKey: string;
  bodyKey: string;
}

const SLIDES: Slide[] = [
  {
    id: 's1',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600',
    titleKey: 'onboarding.title1',
    bodyKey: 'onboarding.desc1',
  },
  {
    id: 's2',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600',
    titleKey: 'onboarding.title2',
    bodyKey: 'onboarding.desc2',
  },
  {
    id: 's3',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8b58?w=600',
    titleKey: 'onboarding.title3',
    bodyKey: 'onboarding.desc3',
  },
];

export default function OnboardingPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const setOnboardingCompleted = useAppStore((s) => s.setOnboardingCompleted);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      setOnboardingCompleted(true);
      router.replace('/(auth)/login');
    } else {
      setIndex((i) => i + 1);
    }
  };

  const skip = () => {
    setOnboardingCompleted(true);
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBarConfig />
      <View style={styles.header}>
        <Button
          label={t('onboarding.skip')}
          variant="text"
          onPress={skip}
          testID="onboarding-skip"
        />
      </View>
      <View style={styles.content} accessibilityLabel={`Onboarding page ${index + 1}`}>
        <Image source={{ uri: slide.image }} style={styles.image} resizeMode="cover" />
        <Text style={[styles.title, { color: colors['on-surface'] }]} accessibilityRole="header">
          {t(slide.titleKey)}
        </Text>
        <Text style={[styles.body, { color: colors['on-surface-variant'] }]}>
          {t(slide.bodyKey)}
        </Text>
        <TaisDivider />
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.id}
              testID={`dot-${s.id}`}
              style={[
                styles.dot,
                { backgroundColor: i === index ? colors.primary : colors.outline },
              ]}
            />
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <Button
          label={isLast ? t('onboarding.start') : t('common.next')}
          variant="primary"
          fullWidth
          onPress={next}
          testID="onboarding-next"
        />
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  image: { width: 260, height: 260, borderRadius: 16 },
  title: { ...typography.h2, fontWeight: '700', textAlign: 'center' },
  body: { ...typography['body-md'], textAlign: 'center' },
  dots: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
  footer: { padding: spacing.lg },
});
