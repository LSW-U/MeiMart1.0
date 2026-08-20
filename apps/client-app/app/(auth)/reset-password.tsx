// ResetPasswordPage — 还原自 ResetPasswordPage.html（180 行）
// 通过 AuthShell 复用外壳，HTML 行数: 180 → RN 行数: ~135
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（外壳行数计入 AuthShell.tsx）
// Fix-16: 替换 PageHeader 为 AuthShell + 手机号 + 验证码 + 新密码
// CP-FIX-2.3: 表单迁移到 react-hook-form + zod（规则 9）
import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/business/AuthShell';
import { useResetPassword, useSendSmsCode } from '@/services/queries/useAuth';
import { toast } from '@/store/toastStore';
import { FormInput } from '@/forms';
import { resetPasswordSchema, type ResetPasswordValues } from '@/forms/schemas/auth';

const COUNTDOWN = 60;

export default function ResetPasswordPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  // P29 审查 F4：确认密码独立开关（与 register 对齐，不再与新密码共用导致双框同显）
  const [showConfirm, setShowConfirm] = useState(false);
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
    const timer = setTimeout(() => setCounter(counter - 1), 1000);
    return () => clearTimeout(timer);
  }, [counter]);

  const sendCode = () => {
    if (!phoneValue) {
      toast.info(t('auth.enterPhone'));
      return;
    }
    sendMutation.mutate({ phone: phoneValue, scene: 'RESET_PASSWORD' }, {
      onSuccess: () => {
        setCounter(COUNTDOWN);
        toast.success(t('auth.smsSent'));
      },
    });
  };

  const submit = (values: ResetPasswordValues) => {
    resetMutation.mutate(
      { phone: values.phone, password: values.password, smsCode: values.code },
      {
        onSuccess: () => {
          // Why: Native 用 Alert 确认后跳转，Web 端 Alert 不显示，用 toast + 延迟跳转
          if (Platform.OS === 'web') {
            toast.success(t('auth.resetSuccess'));
            setTimeout(() => router.replace('/(auth)/login'), 1500);
          } else {
            Alert.alert(t('common.success'), t('auth.resetSuccess'), [
              { text: t('common.ok'), onPress: () => router.replace('/(auth)/login') },
            ]);
          }
        },
        onError: () => toast.error(t('auth.resetFailed')),
      },
    );
  };

  return (
    <SafeAreaWrapper edges={['top', 'bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <AuthShell
        welcomeTitle={t('auth.forgotPasswordTitle')}
        welcomeSub={t('auth.welcomeSubReset')}
        actionLabel={t('auth.resetPassword')}
        onAction={handleSubmit(submit)}
        loading={resetMutation.isPending}
        secondary={
          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: colors.secondary }]}>
              {t('auth.rememberPassword')}{' '}
            </Text>
            <Pressable
              onPress={() => router.replace('/(auth)/login')}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel={t('auth.logIn')}
            >
              <Text style={[styles.loginLink, { color: colors.primary }]}>
                {t('auth.logIn')}
              </Text>
            </Pressable>
          </View>
        }
        testID="reset-password-page"
      >
        <FormInput
          control={control}
          name="phone"
          label={t('auth.phoneNumber')}
          placeholder={t('auth.phonePlaceholder')}
          keyboardType="phone-pad"
          prefix="+670"
          leftIcon="phone"
          testID="reset-phone"
        />

        <View style={styles.codeRow}>
          <View style={styles.codeInput}>
            <FormInput
              control={control}
              name="code"
              label={t('auth.verificationCode')}
              placeholder={t('auth.codePlaceholder')}
              keyboardType="number-pad"
              leftIcon="sms"
              maxLength={6}
              testID="reset-code"
            />
          </View>
          <View style={styles.codeBtn}>
            <Button
              label={counter > 0 ? `${counter}s` : t('auth.sendCodeBtn')}
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
          label={t('auth.newPasswordLabel')}
          placeholder={t('auth.newPasswordPlaceholder')}
          leftIcon="lock"
          rightIcon={showPassword ? 'visibility' : 'visibility_off'}
          onRightIconPress={() => setShowPassword((v) => !v)}
          secureTextEntry={!showPassword}
          testID="reset-password-input"
        />

        <FormInput
          control={control}
          name="confirmPassword"
          label={t('auth.confirmPasswordLabel')}
          placeholder={t('auth.confirmPasswordPlaceholder')}
          leftIcon="lock"
          rightIcon={showConfirm ? 'visibility' : 'visibility_off'}
          onRightIconPress={() => setShowConfirm((v) => !v)}
          secureTextEntry={!showConfirm}
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
