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
import { Checkbox } from '@/components/ui/Checkbox';
import { AuthShell } from '@/components/business/AuthShell';
import { useAuth, BlockedError } from '@/hooks/useAuth';
import { toast } from '@/store/toastStore';
import { FormInput } from '@/forms';
import { toApiErrorText } from '@/utils/apiError';
import { PHONE_PREFIX } from '@/components/ui/PhonePrefix';
import { CaptchaInput } from '@/components/business/CaptchaInput';
import type { CaptchaPayload } from '@/services/auth';
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
  const [sending, setSending] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  // 批1: 图形码凭证——输满 4 位且票据在期才非 null（禁发条件之一，同 login-sms 批A2-2）
  const [captcha, setCaptcha] = useState<CaptchaPayload | null>(null);
  // 批1: 注册链迁 unified——verify 按 user 存在性分流，REGISTER 分支在 useAuth.verify 内
  // complete（R7：带表单密码，后端 hash 入库）→ token → 进首页
  const { sendUnifiedSms, sendUnifiedPending, verify } = useAuth();

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
    // Why: 发码在途禁止再点（真实短信花真金白银，双击=两发）
    if (sending) return;
    // 批1: 图形码未输满（或票据已焚）不发——后端 SMS_CAPTCHA_REQUIRED=true 时必校验
    if (!captcha) {
      toast.info(t('auth.captchaRequiredToast'));
      return;
    }
    setRegisterError(null);
    setSending(true);
    // 批1: 发码迁 unified（scene REGISTER）——challengeId 由 useAuth 存 store
    sendUnifiedSms(phoneValue, 'REGISTER', captcha)
      .then(() => {
        setCounter(COUNTDOWN);
        setRegisterError(null);
        // Why: 票据消费即焚——发码成功后旧 captchaId 已焚，强制重输新图
        setCaptcha(null);
      })
      .catch((error: unknown) => setRegisterError(toApiErrorText(error, t)))
      .finally(() => setSending(false));
  };

  // P2-1（审查批1）: return promise 上交 handleSubmit——isSubmitting 才会覆盖整个 verify 链
  // （按钮 loading/disabled 生效防双击）；catch 已兜底不会 unhandled rejection
  const submit = (values: RegisterValues) => {
    setRegisterError(null);
    // 批1: 验证链迁 unified——verify 分流（LOGIN/REGISTER/BLOCKED）收敛在 useAuth.verify；
    // REGISTER 分支用 R7 通道把表单密码带进 register/complete（后端 hash 入库）后进首页
    return verify({ phone: values.phone, code: values.code, password: values.password })
      .then(() => {
        setRegisterError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof BlockedError) {
          // BLOCKED：账号被禁用/冻结，禁止继续，引导联系客服
          toast.error(t('auth.accountBlocked'));
          return;
        }
        // 批1: 错误走 toApiErrorText 错误码映射（E-USER-003/E-REGISTER-001 等），
        // 未命中回退通用失败文案——不再手写信封读取
        setRegisterError(toApiErrorText(error, t, t('auth.registerFailed')));
      });
  };

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <AuthShell
        welcomeTitle={t('auth.registerTitle')}
        welcomeSub={t('auth.registerSub')}
        actionLabel={t('auth.registerAction')}
        onAction={handleSubmit(submit)}
        loading={formState.isSubmitting}
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
              <Text style={[styles.loginLink, { color: colors.primary }]}>{t('auth.logIn')}</Text>
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
            <Text style={[styles.registerErrorText, { color: colors.error }]}>{registerError}</Text>
          </View>
        )}
        <FormInput
          control={control}
          name="phone"
          label={t('auth.phoneNumber')}
          placeholder={t('auth.phonePlaceholder')}
          keyboardType="phone-pad"
          prefix={PHONE_PREFIX}
          testID="register-phone"
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
              testID="register-code"
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
            testID="register-send"
          >
            <Text style={[styles.codeBtnText, { color: colors.primary }]}>
              {counter > 0 ? `${counter}s` : t('auth.sendCodeBtn')}
            </Text>
          </Pressable>
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
