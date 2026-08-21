// SmsLoginPage — 还原自 SmsLoginPage.html（191 行）
// 通过 AuthShell 复用外壳，HTML 行数: 191 → RN 行数: ~140
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（外壳行数计入 AuthShell.tsx）
// Fix-16: 替换 PageHeader 为 AuthShell + 手机号 + 验证码 + Husu Kódigu 按钮
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
import { Checkbox } from '@/components/ui/Checkbox';
import { AuthShell } from '@/components/business/AuthShell';
import { useLoginSms, useSendSmsCode } from '@/services/queries/useAuth';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { FormInput } from '@/forms';
import { loginSmsSchema, type LoginSmsValues } from '@/forms/schemas/auth';

const COUNTDOWN = 60;

export default function LoginSmsPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [counter, setCounter] = useState(0);
  const setAuth = useAuthStore((s) => s.setAuth);
  const loginMutation = useLoginSms();
  const sendMutation = useSendSmsCode();

  const { control, handleSubmit, formState } = useForm<LoginSmsValues>({
    resolver: zodResolver(loginSmsSchema),
    defaultValues: { phone: '', code: '', agreed: false },
    mode: 'onBlur',
  });
  const phoneValue = useWatch({ control, name: 'phone' }) as string;
  const agreedError = formState.errors.agreed?.message;

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
    sendMutation.mutate({ phone: phoneValue, scene: 'LOGIN' }, {
      onSuccess: () => {
        setCounter(COUNTDOWN);
        toast.success(t('auth.smsSent'));
      },
    });
  };

  const submit = (values: LoginSmsValues) => {
    loginMutation.mutate(
      { phone: values.phone, smsCode: values.code },
      {
        onSuccess: (data) => {
          setAuth(data.accessToken, data.refreshToken);
          router.replace('/(main)/home');
        },
        onError: () => toast.error(t('auth.smsSignInFailed')),
      },
    );
  };

  return (
    <SafeAreaWrapper edges={['top', 'bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <AuthShell
        welcomeTitle={t('auth.welcomeBack')}
        welcomeSub={t('auth.welcomeSubSms')}
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
        testID="login-sms-page"
      >
        <FormInput
          control={control}
          name="phone"
          label={t('auth.phoneNumber')}
          placeholder={t('auth.phonePlaceholder')}
          keyboardType="phone-pad"
          prefix="+670"
          testID="login-sms-phone"
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
              testID="login-sms-code"
            />
          </View>
          {/* .code-btn：50px 与输入框等高，1.5px primary 描边 13/700 红字白底（P29 原型） */}
          <Pressable
            onPress={sendCode}
            disabled={counter > 0 || sendMutation.isPending}
            style={({ pressed }) => [
              styles.codeBtn,
              { borderColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('auth.sendCodeBtn')}
            testID="login-sms-send"
          >
            <Text style={[styles.codeBtnText, { color: colors.primary }]}>
              {counter > 0 ? `${counter}s` : t('auth.sendCodeBtn')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.linkRow}>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={t('auth.signInWithPassword')}
          >
            <Text style={[styles.passwordLink, { color: colors.primary }]}>
              {t('auth.signInWithPassword')}
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
              <Checkbox checked={value} onChange={onChange} testID="login-sms-agreement" />
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
  // .code-row{gap:10px;align-items:flex-end}
  codeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  codeInput: {
    flex: 1,
  },
  // .code-btn{height:50px;border:1.5px solid primary;圆角 12;padding 0 16;13/700 primary}
  codeBtn: {
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passwordLink: {
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
