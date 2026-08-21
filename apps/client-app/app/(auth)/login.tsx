// LoginPage — 还原自 LoginPage.html（209 行）
// 通过 AuthShell 复用外壳，HTML 行数: 209 → RN 行数: ~135（视觉细节在 AuthShell 中）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 65%，外壳行数计入 AuthShell.tsx）
// Fix-16: 替换为 AuthShell + Welcome Back + 账号/密码表单 + Cultural Image
// CP-FIX-2.3: 表单迁移到 react-hook-form + zod（规则 9）
import { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icon } from '@/components/ui/Icon';
import { AuthShell } from '@/components/business/AuthShell';
import { useLoginPassword } from '@/services/queries/useAuth';
import { useAuthStore } from '@/store/authStore';
import { FormInput } from '@/forms';
import { loginPasswordSchema, type LoginPasswordValues } from '@/forms/schemas/auth';

export default function LoginPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const loginMutation = useLoginPassword();

  const { control, handleSubmit, formState } = useForm<LoginPasswordValues>({
    resolver: zodResolver(loginPasswordSchema),
    defaultValues: { phone: '', password: '', agreed: false },
    mode: 'onBlur',
  });
  const agreedError = formState.errors.agreed?.message;

  const submit = (values: LoginPasswordValues) => {
    setLoginError(null);
    loginMutation.mutate(
      { phone: values.phone, password: values.password },
      {
        onSuccess: (data) => {
          setAuth(data.accessToken, data.refreshToken);
          router.replace('/(main)/home');
        },
        onError: (error: unknown) => {
          // Why: 提取后端返回的错误码，用 i18n 翻译，找不到时回退到 generic
          const err = error as {
            response?: { data?: { error?: { code?: string; message?: string } } };
            message?: string;
          };
          const code = err?.response?.data?.error?.code;
          const fallback = err?.response?.data?.error?.message ?? err?.message;
          const translated = code ? t(`errors.${code}`, { defaultValue: fallback }) : fallback;
          setLoginError(translated ?? t('auth.errors.loginFailed'));
        },
      },
    );
  };

  return (
    <SafeAreaWrapper edges={['top', 'bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <AuthShell
        welcomeTitle={t('auth.welcomeBack')}
        welcomeSub={t('auth.welcomeSub')}
        actionLabel={t('auth.signIn')}
        onAction={handleSubmit(submit)}
        loading={loginMutation.isPending}
        secondary={
          <View style={styles.registerRow}>
            <Text style={[styles.registerText, { color: colors.secondary }]}>
              {t('auth.newToMeiMart')}{' '}
            </Text>
            <Pressable
              onPress={() => router.replace('/(auth)/register')}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel={t('auth.registerAccount')}
            >
              <Text style={[styles.registerLink, { color: colors.primary }]}>
                {t('auth.registerAccount')}
              </Text>
            </Pressable>
          </View>
        }
        testID="login-page"
      >
        {/* .error-banner：卡内顶部红底条（P29 原型 Phone5 错误态，D8 前置） */}
        {loginError && (
          <View
            style={[styles.loginErrorBox, { backgroundColor: colors['error-container'] }]}
            accessibilityRole="alert"
          >
            <Icon symbol="error_outline" size={16} color={colors.error} />
            <Text style={[styles.loginErrorText, { color: colors.error }]}>{loginError}</Text>
          </View>
        )}

        <FormInput
          control={control}
          name="phone"
          label={t('auth.phoneNumber')}
          placeholder={t('auth.phonePlaceholder')}
          keyboardType="phone-pad"
          prefix="+670"
          testID="login-phone"
        />

        <FormInput
          control={control}
          name="password"
          label={t('auth.password')}
          placeholder={t('auth.passwordPlaceholder')}
          leftIcon="lock"
          rightIcon={showPassword ? 'visibility' : 'visibility_off'}
          onRightIconPress={() => setShowPassword((v) => !v)}
          secureTextEntry={!showPassword}
          testID="login-password"
        />

        <View style={styles.linkRow}>
          <Pressable
            onPress={() => router.replace('/(auth)/login-sms')}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={t('auth.signInWithPhoneCode')}
          >
            <Text style={[styles.codeLink, { color: colors.primary }]}>
              {t('auth.signInWithPhoneCode')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/(auth)/reset-password')}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={t('auth.forgotPassword')}
          >
            <Text style={[styles.forgotLink, { color: colors.secondary }]}>
              {t('auth.forgotPassword')}
            </Text>
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
            {t('auth.agreePrefix')}{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {t('auth.termsOfService')}
            </Text> {t('auth.and')}{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {t('auth.privacyPolicy')}
            </Text>.
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
  // .link-row a{13px 600}——primary/secondary 色在 JSX 注入
  codeLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '600',
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
  // .error-banner{error-c 底 圆角 10 padding 10 14 gap 8 13/600 error}
  loginErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  loginErrorText: {
    ...typography['body-sm'],
    flex: 1,
    fontWeight: '600',
  },
});
