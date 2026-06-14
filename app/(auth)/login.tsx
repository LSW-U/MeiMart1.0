import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { Button } from '@/components/ui/Button';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { LogoBadge } from '@/components/cultural/LogoBadge';
import { TaisDivider } from '@/components/cultural/TaisDivider';

export default function LoginPage() {
  const { colors } = useTheme();

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBarConfig />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brand}>
          <LogoBadge size={80} />
          <Text
            style={[styles.appName, { color: colors['on-surface'] }]}
            accessibilityRole="header"
          >
            MeiMart
          </Text>
          <Text style={[styles.tagline, { color: colors['on-surface-variant'] }]}>
            Tolu Hamutuk Sosa Fácil
          </Text>
        </View>
        <TaisDivider />
        <View style={styles.actions}>
          <Button
            label="账号密码登录"
            variant="primary"
            fullWidth
            onPress={() => router.push('/(auth)/login-password')}
            testID="login-password-btn"
          />
          <Button
            label="短信验证码登录"
            variant="outline"
            fullWidth
            onPress={() => router.push('/(auth)/login-sms')}
            testID="login-sms-btn"
          />
          <Button
            label="注册新账号"
            variant="text"
            fullWidth
            onPress={() => router.push('/(auth)/register')}
            testID="login-register-btn"
          />
        </View>
        <Text style={[styles.policy, { color: colors['on-surface-variant'] }]}>
          登录即视为同意《用户协议》和《隐私政策》
        </Text>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.xl, justifyContent: 'space-around' },
  brand: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xxl },
  appName: { ...typography.h1, fontWeight: '700' },
  tagline: { ...typography['body-md'] },
  actions: { gap: spacing.md, paddingVertical: spacing.xl },
  policy: {
    ...typography['label-caps'],
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
