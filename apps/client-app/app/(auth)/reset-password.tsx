// ResetPasswordPage — 还原自 ResetPasswordPage.html（180 行）
// 通过 AuthShell 复用外壳，HTML 行数: 180 → RN 行数: ~135
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（外壳行数计入 AuthShell.tsx）
// Fix-16: 替换 PageHeader 为 AuthShell + 手机号 + 验证码 + 新密码
// CP-FIX-2.3: 表单迁移到 react-hook-form + zod（规则 9）
import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/business/AuthShell';
import { useResetPassword, useSendSmsCode } from '@/services/queries/useAuth';
import { FormInput } from '@/forms';
import { resetPasswordSchema, type ResetPasswordValues } from '@/forms/schemas/auth';

const COUNTDOWN = 60;

export default function ResetPasswordPage() {
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [counter, setCounter] = useState(0);
  const resetMutation = useResetPassword();
  const sendMutation = useSendSmsCode();

  const { control, handleSubmit } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { phone: '', code: '', password: '', confirmPassword: '' },
    mode: 'onBlur',
  });
  const phoneValue = useWatch({ control, name: 'phone' }) as string;

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
    sendMutation.mutate({ phone: phoneValue }, {
      onSuccess: () => setCounter(COUNTDOWN),
    });
  };

  const submit = (values: ResetPasswordValues) => {
    resetMutation.mutate(
      { phone: values.phone, password: values.password, smsCode: values.code },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Password has been reset, please log in again', [
            { text: 'OK', onPress: () => router.replace('/(auth)/login') },
          ]);
        },
        onError: () => Alert.alert('Reset failed', 'Please try again later'),
      },
    );
  };

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <AuthShell
        welcomeTitle="Forgot Password?"
        welcomeSub="Reset your password with SMS verification"
        actionLabel="Reset Password"
        onAction={handleSubmit(submit)}
        loading={resetMutation.isPending}
        secondary={
          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: colors.secondary }]}>
              Remember your password?{' '}
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
        testID="reset-password-page"
      >
        <FormInput
          control={control}
          name="phone"
          label="PHONE NUMBER"
          placeholder="+670 7xx xxxx"
          keyboardType="phone-pad"
          leftIcon="phone"
          testID="reset-phone"
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
              testID="reset-code"
            />
          </View>
          <View style={styles.codeBtn}>
            <Button
              label={counter > 0 ? `${counter}s` : 'Husu Kódigu'}
              variant="outline"
              size="sm"
              disabled={counter > 0 || sendMutation.isPending}
              onPress={sendCode}
              testID="reset-send"
            />
          </View>
        </View>

        <FormInput
          control={control}
          name="password"
          label="NEW PASSWORD"
          placeholder="Enter new password"
          leftIcon="lock"
          rightIcon={showPassword ? 'eye' : 'eye-off'}
          onRightIconPress={() => setShowPassword((v) => !v)}
          secureTextEntry={!showPassword}
          testID="reset-password-input"
        />

        <FormInput
          control={control}
          name="confirmPassword"
          label="CONFIRM PASSWORD"
          placeholder="Re-enter new password"
          leftIcon="lock-check"
          rightIcon={showPassword ? 'eye' : 'eye-off'}
          onRightIconPress={() => setShowPassword((v) => !v)}
          secureTextEntry={!showPassword}
          testID="reset-confirm-input"
        />
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
});
