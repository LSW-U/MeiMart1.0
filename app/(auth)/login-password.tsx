// PasswordLoginPage — 还原自 PasswordLoginPage.html（209 行）
// 通过 AuthShell 复用外壳，HTML 行数: 209 → RN 行数: ~135
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（外壳行数计入 AuthShell.tsx）
// Fix-16: 替换 PageHeader 为 AuthShell + 账号/密码表单 + visibility 切换
import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { AuthShell } from '@/components/business/AuthShell';
import { useLoginPassword } from '@/services/queries/useAuth';
import { useAuthStore } from '@/store/authStore';

export default function LoginPasswordPage() {
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const loginMutation = useLoginPassword();

  const submit = () => {
    if (!phone || !password) {
      Alert.alert('Notice', 'Please enter phone and password');
      return;
    }
    if (!agreed) {
      Alert.alert('Notice', 'Please agree to the terms first');
      return;
    }
    loginMutation.mutate(
      { phone, password },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.refreshToken);
          router.replace('/(main)/home');
        },
        onError: () => Alert.alert('Sign in failed', 'Please check your credentials'),
      },
    );
  };

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <AuthShell
        welcomeTitle="Welcome Back"
        welcomeSub="Sign in to your account to start shopping"
        actionLabel="Sign In"
        onAction={submit}
        loading={loginMutation.isPending}
        secondary={
          <View style={styles.registerRow}>
            <Text style={[styles.registerText, { color: colors.secondary }]}>
              New to Mei Mart?{' '}
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Register account"
            >
              <Text style={[styles.registerLink, { color: colors.primary }]}>Register Account</Text>
            </Pressable>
          </View>
        }
        testID="login-password-page"
      >
        <Input
          label="ACCOUNT OR MOBILE"
          placeholder="Email or Phone Number"
          leftIcon="account"
          value={phone}
          onChangeText={setPhone}
          testID="login-password-account"
        />

        <Input
          label="PASSWORD"
          placeholder="123456"
          leftIcon="lock"
          rightIcon={showPassword ? 'eye' : 'eye-off'}
          onRightIconPress={() => setShowPassword((v) => !v)}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          testID="login-password-input"
        />

        <View style={styles.linkRow}>
          <Pressable
            onPress={() => router.push('/(auth)/login-sms')}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Sign in with phone code"
          >
            <Text style={[styles.codeLink, { color: colors.primary }]}>
              Sign in with phone code
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(auth)/reset-password')}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Forgot password"
          >
            <Text style={[styles.forgotLink, { color: colors.secondary }]}>Forgot Password?</Text>
          </Pressable>
        </View>

        <View style={styles.agreementRow}>
          <Checkbox checked={agreed} onChange={setAgreed} testID="login-password-agreement" />
          <Text style={[styles.agreementText, { color: colors['on-surface-variant'] }]}>
            {"By logging in, I agree to Mei Mart's "}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              Terms of Service
            </Text> and{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Privacy Policy</Text>.
          </Text>
        </View>
      </AuthShell>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeLink: {
    ...typography['label-caps'],
    textDecorationLine: 'underline',
  },
  forgotLink: {
    ...typography['label-caps'],
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  agreementText: {
    ...typography['body-sm'],
    flex: 1,
    lineHeight: 18,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    ...typography['body-md'],
  },
  registerLink: {
    ...typography['body-md'],
    fontWeight: '700',
  },
});
