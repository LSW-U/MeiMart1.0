import { StyleSheet, View, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PaymentResultPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <View style={styles.body}>
        <View
          style={[styles.iconBox, { backgroundColor: colors.primary }]}
          accessibilityRole="image"
        >
          <MaterialCommunityIcons name="check" size={48} color={colors['on-primary']} />
        </View>
        <Text style={[styles.title, { color: colors['on-surface'] }]} accessibilityRole="header">
          {t('result.successTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: colors['on-surface-variant'] }]}>
          {t('result.successDesc')}
        </Text>
        <TaisDivider />
        <View style={styles.actions}>
          <Button
            label={t('result.viewOrder')}
            variant="primary"
            fullWidth
            onPress={() => router.replace('/(main)/orders')}
            testID="result-view-orders"
          />
          <Button
            label={t('result.continueShopping')}
            variant="outline"
            fullWidth
            onPress={() => router.replace('/(main)/home')}
            testID="result-continue"
          />
        </View>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h2, fontWeight: '700' },
  subtitle: { ...typography['body-md'], textAlign: 'center' },
  actions: { width: '100%', gap: spacing.md, marginTop: spacing.xl },
});
