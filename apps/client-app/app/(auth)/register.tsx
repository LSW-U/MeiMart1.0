// RegisterPage — 还原自 RegisterPage.html（185 行）
// 通过 AuthShell 复用外壳，HTML 行数: 185 → RN 行数: ~140
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（外壳行数计入 AuthShell.tsx）
// Fix-16: 替换 PageHeader 为 AuthShell + 手机号 + 验证码 + 密码 + 确认密码
// CP-FIX-2.3: 表单迁移到 react-hook-form + zod（规则 9）
import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
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

// P29-D5: 密码强度分级——1 弱（<8 位或纯数字/纯字母）/ 2 中（8+ 含字母+数字）/ 3 强（8+ 字母+数字+特殊字符）
export function passwordStrength(pwd: string): 1 | 2 | 3 {
  if (pwd.length < 8 || !/[a-zA-Z]/.test(pwd) || !/\d/.test(pwd)) return 1;
  if (!/[^a-zA-Z0-9]/.test(pwd)) return 2;
  return 3;
}

const STRENGTH_LABEL: Record<1 | 2 | 3, string> = {
  1: 'auth.pwdWeak',
  2: 'auth.pwdMedium',
  3: 'auth.pwdStrong',
};
const STRENGTH_HINT: Record<1 | 2 | 3, string> = {
  1: 'auth.pwdHintWeak',
  2: 'auth.pwdHintMedium',
  3: 'auth.pwdHintStrong',
};

export default function RegisterPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [counter, setCounter] = useState(0);
  const [registerError, setRegisterError] = useState<string | null>(null);
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
  const passwordValue = useWatch({ control, name: 'password' }) as string;
  const strength = passwordStrength(passwordValue ?? '');
  const agreedError = formState.errors.agreed?.message;

  useEffect(() => {
    if (counter <= 0) return;
    const timer = setTimeout(() => setCounter(counter - 1), 1000);
    return () => clearTimeout(timer);
  }, [counter]);

  const sendCode = () => {
    if (!phoneValue) {
      setRegisterError(t('auth.enterPhone'));
      return;
    }
    setRegisterError(null);
    // Why: 必须传 scene='REGISTER'，后端按 scene 区分验证码用途
    // 不传 scene 会被当作 LOGIN，注册时验证码不匹配，返回 E-USER-003
    sendMutation.mutate({ phone: phoneValue, scene: 'REGISTER' }, {
      onSuccess: () => {
        setCounter(COUNTDOWN);
        setRegisterError(null);
      },
      onError: (error: unknown) => {
        const err = error as {
          response?: { data?: { error?: { code?: string; message?: string } } };
          message?: string;
        };
        const msg = err?.response?.data?.error?.message ?? err?.message ?? t('errors.generic');
        setRegisterError(msg);
      },
    });
  };

  const submit = (values: RegisterValues) => {
    setRegisterError(null);
    registerMutation.mutate(
      { phone: values.phone, password: values.password, smsCode: values.code },
      {
        onSuccess: (data) => {
          setAuth(data.accessToken, data.refreshToken);
          router.replace('/(main)/home');
        },
        onError: (error: unknown) => {
          // Why: 提取后端错误码，用 i18n 翻译，找不到时回退到 generic
          const err = error as {
            response?: { data?: { error?: { code?: string; message?: string } } };
            message?: string;
          };
          const code = err?.response?.data?.error?.code;
          const fallback = err?.response?.data?.error?.message ?? err?.message;
          const translated = code ? t(`errors.${code}`, { defaultValue: fallback }) : fallback;
          setRegisterError(translated ?? t('auth.registerFailed'));
        },
      },
    );
  };

  return (
    <SafeAreaWrapper edges={['top', 'bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <AuthShell
        welcomeTitle={t('auth.registerTitle')}
        welcomeSub={t('auth.registerSub')}
        actionLabel={t('auth.registerAction')}
        onAction={handleSubmit(submit)}
        loading={registerMutation.isPending}
        secondary={
          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: colors.secondary }]}>
              {t('auth.alreadyHaveAccount')}{' '}
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
        testID="register-page"
      >
        {registerError && (
          <View
            style={[styles.registerErrorBox, { backgroundColor: colors['error-container'] }]}
            accessibilityRole="alert"
          >
            <Text style={[styles.registerErrorText, { color: colors.error }]}>
              {registerError}
            </Text>
          </View>
        )}
        <FormInput
          control={control}
          name="phone"
          label={t('auth.phoneNumber')}
          placeholder={t('auth.phonePlaceholder')}
          keyboardType="phone-pad"
          prefix="+670"
          leftIcon="phone"
          testID="register-phone"
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
              testID="register-code"
            />
          </View>
          <View style={styles.codeBtn}>
            <Button
              label={counter > 0 ? `${counter}s` : t('auth.sendCodeBtn')}
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
          label={t('auth.setPasswordLabel')}
          placeholder={t('auth.setPasswordPlaceholder')}
          leftIcon="lock"
          rightIcon={showPassword ? 'visibility' : 'visibility_off'}
          onRightIconPress={() => setShowPassword((v) => !v)}
          secureTextEntry={!showPassword}
          testID="register-password"
        />

        {/* P29-D5: 密码强度条（HTML .pwd-strength —— 3 段 flex bar + hint 文字） */}
        {passwordValue !== '' && (
          <View testID="register-pwd-strength">
            <View style={styles.pwdStrength}>
              {([1, 2, 3] as const).map((seg) => (
                <View
                  key={seg}
                  style={[
                    styles.pwdBar,
                    {
                      backgroundColor:
                        seg <= strength
                          ? strength === 1
                            ? colors.error
                            : strength === 2
                              ? colors.semantic.warning
                              : colors.semantic.positive
                          : colors['outline-variant'],
                    },
                  ]}
                />
              ))}
            </View>
            <Text
              style={[
                styles.pwdHint,
                {
                  color:
                    strength === 1
                      ? colors.error
                      : strength === 2
                        ? colors.semantic.warning
                        : colors.semantic.positive,
                },
              ]}
            >
              {t(STRENGTH_LABEL[strength])}
              {' · '}
              {t(STRENGTH_HINT[strength])}
            </Text>
          </View>
        )}

        <FormInput
          control={control}
          name="confirmPassword"
          label={t('auth.confirmPasswordLabel')}
          placeholder={t('auth.confirmPasswordPlaceholder')}
          leftIcon="lock"
          rightIcon={showConfirm ? 'visibility' : 'visibility_off'}
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
  registerErrorBox: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  // P29-D5: HTML .pwd-strength（3 段 flex bar gap 4）+ .pwd-hint（11px）
  pwdStrength: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  pwdBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  pwdHint: {
    ...typography['body-sm'],
    fontSize: 11,
    marginTop: 4,
  },
  registerErrorText: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
});
