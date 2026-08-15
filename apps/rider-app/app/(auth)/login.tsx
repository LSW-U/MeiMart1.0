import { colors } from "../../src/theme/colors";
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { ConfirmDialog } from '../../src/components/feedback/ConfirmDialog';
import { showToast } from '../../src/components/feedback/Toast';
import { AppIcon, Button, Card, Input } from '../../src/components/ui';
import { useAuth } from '../../src/hooks/useAuth';
import { useTranslation } from '../../src/i18n/useTranslation';
import { isValidPhone } from '../../src/services/auth';
import { ApiError } from '../../src/services/api';
import { getLanguageOptions, type AppLanguage } from '../../src/services/settings';
import { useUpdateRiderSettings } from '../../src/services/queries/useSettings';

type LoginMode = 'password' | 'sms';

const enabledLanguages = getLanguageOptions();

// Why: 开发环境显示 mock-login 按钮，跳过密码验证
const isDev = __DEV__;

export default function LoginPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { login, mockLogin, sendSmsCode, isLoginPending } = useAuth();
  const updateSettings = useUpdateRiderSettings();
  const [mode, setMode] = useState<LoginMode>('password');
  const [accepted, setAccepted] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [phoneInvalidVisible, setPhoneInvalidVisible] = useState(false);
  const [codeSentVisible, setCodeSentVisible] = useState(false);
  const [codeSentPhone, setCodeSentPhone] = useState('');
  const [featureInProgressVisible, setFeatureInProgressVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isPassword = mode === 'password';

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const startCountdown = () => {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (countdown > 0) return;
    if (!isValidPhone(phone)) {
      setPhoneInvalidVisible(true);
      return;
    }
    try {
      await sendSmsCode(phone);
      setCodeSentPhone(phone);
      setCodeSentVisible(true);
      startCountdown();
    } catch {
      setPhoneInvalidVisible(true);
    }
  };

  const handleLogin = async () => {
    try {
      await login(
        phone,
        mode === 'password' ? password : undefined,
        mode === 'sms' ? code : undefined,
      );
      // router.replace('/(main)/tasks') 已在 useAuth.login 内部处理
    } catch (e) {
      console.error('[login] handleLogin failed:', e);
      // ApiError 业务失败（密码错/账号不存在）vs 网络异常，差异化 toast
      const msg = e instanceof ApiError ? t('auth.login.failed') : t('common.networkError');
      showToast(msg, 'error');
    }
  };

  const nextLanguage: AppLanguage = (() => {
    const index = enabledLanguages.findIndex((option) => option.code === language);
    const next = enabledLanguages[(index + 1 + enabledLanguages.length) % enabledLanguages.length];
    return (next ?? enabledLanguages[0]).code;
  })();
  const nextLanguageLabel = enabledLanguages.find((option) => option.code === nextLanguage)?.nativeLabel ?? '';

  const switchLanguage = () => {
    void updateSettings.mutateAsync({ language: nextLanguage });
  };

  const sendCodeLabel = countdown > 0 ? t('auth.login.resend', { seconds: countdown }) : t('auth.login.sendCode');

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="min-h-full items-center justify-center px-5 py-12">
      <View className="mb-6 flex-row items-center gap-1">
        <Text className="text-3xl text-primary">▣</Text>
        <Text className="text-xl font-bold text-primary">{t('app.name')}</Text>
      </View>

      <Card className="w-full max-w-md gap-6 shadow-primary-container/5">
        <View className="items-center">
          <Text className="mb-1 text-3xl font-bold text-primary">{t('auth.login.title')}</Text>
          <Text className="text-center text-sm text-on-surface-variant">{t('auth.login.subtitle')}</Text>
        </View>

        <View className="flex-row border-b border-outline-variant">
          <Pressable accessibilityRole="button" accessibilityLabel={t('auth.login.passwordTab')} accessibilityState={{ selected: isPassword }} className="flex-1 py-4" onPress={() => setMode('password')}>
            <Text className={`text-center text-xs font-bold tracking-wider ${isPassword ? 'text-primary' : 'text-on-surface-variant'}`}>
              {t('auth.login.passwordTab')}
            </Text>
            {isPassword ? <View className="mt-3 h-[3px] rounded-full bg-primary" /> : null}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('auth.login.smsTab')} accessibilityState={{ selected: !isPassword }} className="flex-1 py-4" onPress={() => setMode('sms')}>
            <Text className={`text-center text-xs font-bold tracking-wider ${!isPassword ? 'text-primary' : 'text-on-surface-variant'}`}>
              {t('auth.login.smsTab')}
            </Text>
            {!isPassword ? <View className="mt-3 h-[3px] rounded-full bg-primary" /> : null}
          </Pressable>
        </View>

        <View className="gap-4">
          <Input
            keyboardType="phone-pad"
            label={t('auth.login.phoneLabel')}
            placeholder={t('auth.login.phonePlaceholder')}
            value={phone}
            onChangeText={setPhone}
          />
          {isPassword ? (
            <Input
              label={t('auth.login.passwordLabel')}
              leftSlot={<AppIcon color={colors.outline} name="lock" size={24} />}
              placeholder={t('auth.login.passwordPlaceholder')}
              rightSlot={
                <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? t('auth.login.hidePassword') : t('auth.login.showPassword')} onPress={() => setPasswordVisible((value) => !value)}>
                  <AppIcon color={colors.outline} name={passwordVisible ? 'eye' : 'eyeOff'} size={24} />
                </Pressable>
              }
              secureTextEntry={!passwordVisible}
              value={password}
              onChangeText={setPassword}
            />
          ) : (
            <Input
              keyboardType="number-pad"
              label={t('auth.login.smsLabel')}
              placeholder={t('auth.login.smsPlaceholder')}
              rightSlot={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={sendCodeLabel}
                  className={`rounded-full px-4 py-2.5 ${countdown > 0 ? 'bg-outline-variant' : 'bg-primary'}`}
                  disabled={countdown > 0}
                  onPress={() => void handleSendCode()}
                >
                  <Text className={`text-xs font-bold ${countdown > 0 ? 'text-outline' : 'text-white'}`}>{sendCodeLabel}</Text>
                </Pressable>
              }
              value={code}
              onChangeText={setCode}
            />
          )}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel={t('auth.login.forgotPassword')} className="items-end" onPress={() => setFeatureInProgressVisible(true)}>
          <Text className="text-[11px] font-bold text-primary">{t('auth.login.forgotPassword')}</Text>
        </Pressable>

        <View className="gap-4">
          <View className="flex-row items-start gap-2">
            <Switch accessibilityRole="switch" accessibilityLabel={t('auth.login.agreeTerms')} accessibilityState={{ checked: accepted }} onValueChange={setAccepted} value={accepted} />
            <Text className="flex-1 text-[13px] leading-5 text-on-surface-variant">
              {t('auth.login.termsPrefix')}{' '}
              <Text accessibilityRole="link" className="font-semibold text-primary" onPress={() => router.push('/terms')}>{t('auth.login.terms')}</Text>{' '}
              {t('auth.login.privacyPrefix')}{' '}
              <Text accessibilityRole="link" className="font-semibold text-primary" onPress={() => router.push('/privacy')}>{t('auth.login.privacy')}</Text>.
            </Text>
          </View>

          <Button disabled={isLoginPending} loading={isLoginPending} onPress={() => void handleLogin()}>{t('auth.login.submit')}</Button>

          {/* Why: 开发环境 mock-login 按钮，跳过密码验证直接登录骑手账号 */}
          {isDev && (
            <Pressable accessibilityRole="button" accessibilityLabel="[DEV] 快速登录骑手账号" className="mt-2 items-center" onPress={() => void mockLogin()}>
              <Text className="text-xs text-outline">[DEV] 快速登录骑手账号</Text>
            </Pressable>
          )}
        </View>

        <View className="items-center pt-1">
          <Text className="text-sm text-on-surface-variant">
            {t('auth.login.newHere')} <Text accessibilityRole="link" className="font-bold text-primary" onPress={() => router.push('/(auth)/register')}>{t('auth.login.register')}</Text>
          </Text>
        </View>
      </Card>

      <View className="mt-8 flex-row items-center gap-6">
        <Pressable accessibilityRole="button" accessibilityLabel={t('auth.login.help')} className="flex-row items-center gap-1.5" onPress={() => router.push('/help')}>
          <AppIcon color={colors.outline} name="help" size={14} />
          <Text className="text-[11px] font-bold text-outline">{t('auth.login.help')}</Text>
        </Pressable>
        <View className="h-3 w-px bg-outline-variant" />
        <Pressable accessibilityRole="button" accessibilityLabel={t('auth.login.languageSwitch', { language: nextLanguageLabel })} className="flex-row items-center gap-1.5" onPress={switchLanguage}>
          <AppIcon color={colors.outline} name="language" size={14} />
          <Text className="text-[11px] font-bold text-outline">{t('auth.login.languageSwitch', { language: nextLanguageLabel })}</Text>
        </Pressable>
      </View>

      <ConfirmDialog
        message={t('auth.login.phoneInvalid.message')}
        okLabel={t('auth.login.phoneInvalid.ok')}
        title={t('auth.login.phoneInvalid.title')}
        visible={phoneInvalidVisible}
        onCancel={() => setPhoneInvalidVisible(false)}
        onOk={() => setPhoneInvalidVisible(false)}
      />
      <ConfirmDialog
        message={t('auth.login.codeSent.message', { phone: codeSentPhone })}
        okLabel={t('auth.login.phoneInvalid.ok')}
        title={t('auth.login.codeSent.title')}
        visible={codeSentVisible}
        onCancel={() => setCodeSentVisible(false)}
        onOk={() => setCodeSentVisible(false)}
      />
      <ConfirmDialog
        message={t('auth.login.featureInProgress.message')}
        okLabel={t('auth.login.featureInProgress.ok')}
        title={t('auth.login.featureInProgress.title')}
        visible={featureInProgressVisible}
        onCancel={() => setFeatureInProgressVisible(false)}
        onOk={() => setFeatureInProgressVisible(false)}
      />
    </ScrollView>
  );
}
