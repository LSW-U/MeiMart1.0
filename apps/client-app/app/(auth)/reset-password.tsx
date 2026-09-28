// ResetPasswordPage — 还原自 ResetPasswordPage.html（180 行）
// 通过 AuthShell 复用外壳，HTML 行数: 180 → RN 行数: ~135
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（外壳行数计入 AuthShell.tsx）
// Fix-16: 替换 PageHeader 为 AuthShell + 手机号 + 验证码 + 新密码
// CP-FIX-2.3: 表单迁移到 react-hook-form + zod（规则 9）
// 批1：发码迁 unified（scene RESET_PASSWORD）+ challengeId 链 + 图形码 + toApiErrorText（U6/U8）
import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { AuthShell } from '@/components/business/AuthShell';
import { useResetPassword } from '@/services/queries/useAuth';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/store/toastStore';
import { FormInput } from '@/forms';
import { toApiErrorText } from '@/utils/apiError';
import { PHONE_PREFIX } from '@/components/ui/PhonePrefix';
import { CaptchaInput } from '@/components/business/CaptchaInput';
import type { CaptchaPayload } from '@/services/auth';
import { resetPasswordSchema, type ResetPasswordValues } from '@/forms/schemas/auth';

const COUNTDOWN = 60;

export default function ResetPasswordPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  // P29 审查 F4：确认密码独立开关（与 register 对齐，不再与新密码共用导致双框同显）
  const [showConfirm, setShowConfirm] = useState(false);
  const [counter, setCounter] = useState(0);
  const [sending, setSending] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  // 批1: 图形码凭证——输满 4 位且票据在期才非 null（禁发条件之一，同 login-sms 批A2-2）
  const [captcha, setCaptcha] = useState<CaptchaPayload | null>(null);
  const resetMutation = useResetPassword();
  const { sendUnifiedSms, sendUnifiedPending } = useAuth();

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
    // Why: 发码在途禁止再点（真实短信花真金白银，双击=两发）
    if (sending) return;
    // 批1: 图形码未输满（或票据已焚）不发——后端 SMS_CAPTCHA_REQUIRED=true 时必校验
    if (!captcha) {
      toast.info(t('auth.captchaRequiredToast'));
      return;
    }
    setSending(true);
    // 批1: 发码迁 unified（scene RESET_PASSWORD）——challengeId 由 useAuth 存 store
    sendUnifiedSms(phoneValue, 'RESET_PASSWORD', captcha)
      .then(() => {
        setCounter(COUNTDOWN);
        setSmsError(null);
        // Why: 票据消费即焚——发码成功后旧 captchaId 已焚，强制重输新图
        setCaptcha(null);
      })
      .catch((error: unknown) => setSmsError(toApiErrorText(error, t)))
      .finally(() => setSending(false));
  };

  const submit = (values: ResetPasswordValues) => {
    setSmsError(null);
    resetMutation.mutate(
      { phone: values.phone, smsCode: values.code, newPassword: values.password },
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
        // 批1: 错误走 toApiErrorText 错误码映射（E-USER-003 码错/过期等），
        // 未命中回退通用失败文案——不再一律「重置失败」误导
        onError: (error: unknown) => toast.error(toApiErrorText(error, t, t('auth.resetFailed'))),
      },
    );
  };

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
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
              <Text style={[styles.loginLink, { color: colors.primary }]}>{t('auth.logIn')}</Text>
            </Pressable>
          </View>
        }
        testID="reset-password-page"
      >
        {smsError && (
          <View
            style={[styles.errorBox, { backgroundColor: colors['error-container'] }]}
            accessibilityRole="alert"
          >
            <Text style={[styles.errorBoxText, { color: colors.error }]}>{smsError}</Text>
          </View>
        )}
        <FormInput
          control={control}
          name="phone"
          label={t('auth.phoneNumber')}
          placeholder={t('auth.phonePlaceholder')}
          keyboardType="phone-pad"
          prefix={PHONE_PREFIX}
          testID="reset-phone"
        />

        {/* 批1: 图形验证码——发码前必输（后端开关 SMS_CAPTCHA_REQUIRED=true） */}
        <CaptchaInput onChange={setCaptcha} />

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
          {/* .code-btn：50px 与输入框等高，1.5px primary 描边 13/700 红字白底（P29 原型） */}
          <Pressable
            onPress={sendCode}
            disabled={counter > 0 || sending || sendUnifiedPending}
            style={({ pressed }) => [
              styles.codeBtn,
              { borderColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('auth.sendCodeBtn')}
            testID="reset-send"
          >
            <Text style={[styles.codeBtnText, { color: colors.primary }]}>
              {counter > 0 ? `${counter}s` : t('auth.sendCodeBtn')}
            </Text>
          </Pressable>
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
  // .code-row{gap:10px;align-items:flex-end}
  codeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  codeInput: {
    flex: 1,
  },
  // .code-btn{height:50px;border:1.5px solid primary;圆角 12;padding 0 16;13/700 红字白底（P29 原型）}
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
  errorBox: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  errorBoxText: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
});
