// RegisterPage — 还原自 RegisterPage.html（185 行）
// 通过 AuthShell 复用外壳，HTML 行数: 185 → RN 行数: ~140
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（外壳行数计入 AuthShell.tsx）
// Fix-16: 替换 PageHeader 为 AuthShell + 手机号 + 验证码 + 密码 + 确认密码
// CP-FIX-2.3: 表单迁移到 react-hook-form + zod（规则 9）
import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { AuthShell } from '@/components/business/AuthShell';
import { useRegister, useSendSmsCode } from '@/services/queries/useAuth';
import { useAuthStore } from '@/store/authStore';
import { FormInput } from '@/forms';
import { registerSchema, type RegisterValues } from '@/forms/schemas/auth';

const COUNTDOWN = 60;

export default function RegisterPage() {
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [counter, setCounter] = useState(0);
  const setAuth = useAuthStore((s) => s.setAuth);
  const registerMutation = useRegister();
  const sendMutation = useSendSmsCode();

  const { control, handleSubmit, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: '',
      code: '',
      password: '',
      confirmPassword: '',
      inviteCode: '',
      agreed: false,
    },
    mode: 'onBlur',
  });
  const phoneValue = useWatch({ control, name: 'phone' }) as string;
  const agreedError = formState.errors.agreed?.message;

  useEffect(() => {
    if (counter <= 0) return;
    const t = setTimeout(() => setCounter(counter - 1), 1000);
    return () => clearTimeout(t);
  }, [counter]);

  const sendCode = () => {
    if (!phoneValue) {
      Alert.alert('Notice', 'Please enter phone number');
      return;
    }
    sendMutation.mutate(phoneValue, {
      onSuccess: () => setCounter(COUNTDOWN),
    });
  };

  const submit = (values: RegisterValues) => {
    registerMutation.mutate(
      { phone: values.phone, password: values.password },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.refreshToken);
          router.replace('/(main)/home');
        },
        onError: () => Alert.alert('Registration failed', 'Please try again later'),
      },
    );
  };

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <AuthShell
        welcomeTitle="Registu Kontu"
        welcomeSub="Welcome! Join us and start shopping."
        actionLabel="Register"
        onAction={handleSubmit(submit)}
        loading={registerMutation.isPending}
        secondary={
          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: colors.secondary }]}>
              Already have an account?{' '}
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Log in"
            >
              <Text style={[styles.loginLink, { color: colors.primary }]}>Log In</Text>
            </Pressable>
          </View>
        }
        testID="register-page"
      >
        <FormInput
          control={control}
          name="phone"
          label="PHONE NUMBER"
          placeholder="+670 7xx xxxx"
          keyboardType="phone-pad"
          leftIcon="phone"
          testID="register-phone"
        />

        <View style={styles.codeRow}>
          <View style={styles.codeInput}>
            <FormInput
              control={control}
              name="code"
              label="VERIFICATION CODE"
              placeholder="6-digit code"
              keyboardType="number-pad"
              leftIcon="message-text"
              maxLength={6}
              testID="register-code"
            />
          </View>
          <View style={styles.codeBtn}>
            <Button
              label={counter > 0 ? `${counter}s` : 'Husu Kódigu'}
              variant="outline"
              size="sm"
              disabled={counter > 0 || sendMutation.isPending}
              onPress={sendCode}
              testID="register-send"
            />
          </View>
        </View>

        <FormInput
          control={control}
          name="password"
          label="SET PASSWORD"
          placeholder="Enter your password"
          leftIcon="lock"
          rightIcon={showPassword ? 'eye' : 'eye-off'}
          onRightIconPress={() => setShowPassword((v) => !v)}
          secureTextEntry={!showPassword}
          testID="register-password"
        />

        <FormInput
          control={control}
          name="confirmPassword"
          label="CONFIRM PASSWORD"
          placeholder="Re-enter your password"
          leftIcon="lock-check"
          rightIcon={showConfirm ? 'eye' : 'eye-off'}
          onRightIconPress={() => setShowConfirm((v) => !v)}
          secureTextEntry={!showConfirm}
          testID="register-confirm"
        />

        <View style={styles.agreementRow}>
          <Controller
            control={control}
            name="agreed"
            render={({ field: { value, onChange } }) => (
              <Checkbox checked={value} onChange={onChange} testID="register-agreement" />
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
  codeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  codeInput: {
    flex: 1,
  },
  codeBtn: {
    paddingBottom: spacing.xs,
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    ...typography['body-md'],
  },
  loginLink: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  errorText: {
    ...typography['body-sm'],
    marginTop: spacing.xs,
  },
});
