// LoginPage — 还原自 LoginPage.html（209 行）
// 通过 AuthShell 复用外壳，HTML 行数: 209 → RN 行数: ~135（视觉细节在 AuthShell 中）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 65%，外壳行数计入 AuthShell.tsx）
// Fix-16: 替换为 AuthShell + Welcome Back + 账号/密码表单 + Cultural Image
// CP-FIX-2.3: 表单迁移到 react-hook-form + zod（规则 9）
import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Checkbox } from '@/components/ui/Checkbox';
import { AuthShell } from '@/components/business/AuthShell';
import { useLoginPassword } from '@/services/queries/useAuth';
import { useAuthStore } from '@/store/authStore';
import { FormInput } from '@/forms';
import { loginPasswordSchema, type LoginPasswordValues } from '@/forms/schemas/auth';

export default function LoginPage() {
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const loginMutation = useLoginPassword();

  const { control, handleSubmit, formState } = useForm<LoginPasswordValues>({
    resolver: zodResolver(loginPasswordSchema),
    defaultValues: { account: '', password: '', agreed: false },
    mode: 'onBlur',
  });
  const agreedError = formState.errors.agreed?.message;

  const submit = (values: LoginPasswordValues) => {
    loginMutation.mutate(
      { phone: values.account, password: values.password },
      {
        onSuccess: (data) => {
          setAuth(data.accessToken, data.refreshToken);
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
        onAction={handleSubmit(submit)}
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
        testID="login-page"
      >
        <FormInput
          control={control}
          name="account"
          label="ACCOUNT OR MOBILE"
          placeholder="Email or Phone Number"
          leftIcon="account"
          testID="login-account"
        />

        <FormInput
          control={control}
          name="password"
          label="PASSWORD"
          placeholder="123456"
          leftIcon="lock"
          rightIcon={showPassword ? 'eye' : 'eye-off'}
          onRightIconPress={() => setShowPassword((v) => !v)}
          secureTextEntry={!showPassword}
          testID="login-password"
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
          <Controller
            control={control}
            name="agreed"
            render={({ field: { value, onChange } }) => (
              <Checkbox checked={value} onChange={onChange} testID="login-agreement" />
            )}
          />
          <Text style={[styles.agreementText, { color: colors['on-surface-variant'] }]}>
            {"By logging in, I agree to Mei Mart's "}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              Terms of Service
            </Text> and{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Privacy Policy</Text>.
          </Text>
        </View>
        {agreedError && (
          <Text style={[styles.errorText, { color: colors.error }]} accessibilityRole="alert">
            {agreedError}
          </Text>
        )}
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
  errorText: {
    ...typography['body-sm'],
    marginTop: spacing.xs,
  },
});
