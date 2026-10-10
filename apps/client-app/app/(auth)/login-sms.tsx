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
import { useAuth, BlockedError } from '@/hooks/useAuth';
import { CaptchaInput } from '@/components/business/CaptchaInput';
import type { CaptchaPayload } from '@/services/auth';
import { toast } from '@/store/toastStore';
import { FormInput } from '@/forms';
import { toApiErrorText } from '@/utils/apiError';
import { PHONE_PREFIX } from '@/components/ui/PhonePrefix';
import { loginSmsSchema, type LoginSmsValues } from '@/forms/schemas/auth';

// 批A2-1: unified 入口——send 存 challengeId，verify 按 action 分流（LOGIN/REGISTER/BLOCKED）
const COUNTDOWN = 60;

export default function LoginSmsPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [counter, setCounter] = useState(0);
  const [sending, setSending] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  // 批A2-2: 图形码凭证——输满 4 位且票据在期才非 null（禁发条件之一）
  const [captcha, setCaptcha] = useState<CaptchaPayload | null>(null);
  const { sendUnifiedSms, sendUnifiedPending, verify } = useAuth();

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
    // Why: 发码在途禁止再点（真实短信花真金白银，双击=两发；60s 频控是后端最后防线非前端本分）
    if (sending) return;
    // 批A2-2: 图形码未输满（或票据已焚）不发——后端 SMS_CAPTCHA_REQUIRED=true 时必校验
    if (!captcha) {
      toast.info(t('auth.captchaRequiredToast'));
      return;
    }
    setSending(true);
    sendUnifiedSms(phoneValue, 'LOGIN', captcha)
      .then(() => {
        setCounter(COUNTDOWN);
        setSmsError(null);
        // Why: 票据消费即焚——发码成功后旧 captchaId 已焚，强制重输新图
        setCaptcha(null);
      })
      // P2-2: 读后端错误码映射 errors.*（E-CAPTCHA-001 / E-RATELIMIT-001 / E-SMS-001），
      // 未命中回退网络错误——不再一律显示「网络错误」误导重试
      .catch((error: unknown) => setSmsError(toApiErrorText(error, t)))
      .finally(() => setSending(false));
  };

  const submit = (values: LoginSmsValues) => {
    setSmsError(null);
    verify({ phone: values.phone, code: values.code })
      .then(() => {
        // LOGIN/REGISTER 已在 useAuth.verify 内分流完成（存 token + replace 首页）
        setSmsError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof BlockedError) {
          // BLOCKED：账号被禁用/冻结，禁止继续，引导联系客服
          toast.error(t('auth.accountBlocked'));
          return;
        }
        // P2-2: verify 失败同样走错误码映射（E-USER-003 码过期等），否则回退通用失败文案
        setSmsError(toApiErrorText(error, t, t('auth.smsSignInFailed')));
      });
  };

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <AuthShell
        welcomeTitle={t('auth.welcomeBack')}
        welcomeSub={t('auth.welcomeSubSms')}
        actionLabel={t('auth.signIn')}
        onAction={handleSubmit(submit)}
        loading={formState.isSubmitting}
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
          testID="login-sms-phone"
        />

        {/* 批A2-2: 图形验证码——发码前必输（后端开关 SMS_CAPTCHA_REQUIRED=true） */}
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
              testID="login-sms-code"
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
            {/* A-P2-6（D3）: 协议可点——站内 /legal/terms（app/legal/[type].tsx 已投产） */}
            <Text
              onPress={() => router.push('/legal/terms')}
              style={{ color: colors.primary, fontWeight: '700' }}
            >
              {t('auth.termsOfService')}
            </Text>{' '}
            {t('auth.and')}{' '}
            <Text
              onPress={() => router.push('/legal/privacy')}
              style={{ color: colors.primary, fontWeight: '700' }}
            >
              {t('auth.privacyPolicy')}
            </Text>
            .
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
