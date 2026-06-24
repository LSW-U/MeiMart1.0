import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { ConfirmDialog } from '../../src/components/feedback/ConfirmDialog';
import { AppIcon, Button, Card, Input } from '../../src/components/ui';
import { useAuth } from '../../src/hooks/useAuth';
import { useTranslation } from '../../src/i18n/useTranslation';
import { isValidPhone } from '../../src/services/auth';
import { getLanguageOptions, type AppLanguage } from '../../src/services/settings';
import { useAppStore } from '../../src/store/useAppStore';

type LoginMode = 'password' | 'sms';

const enabledLanguages = getLanguageOptions();

export default function LoginPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { login, sendSmsCode } = useAuth();
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
    } catch {
      // TODO: 接入 Toast 反馈错误
    }
  };

  const nextLanguage: AppLanguage = (() => {
    const index = enabledLanguages.findIndex((option) => option.code === language);
    const next = enabledLanguages[(index + 1 + enabledLanguages.length) % enabledLanguages.length];
    return (next ?? enabledLanguages[0]).code;
  })();
  const nextLanguageLabel = enabledLanguages.find((option) => option.code === nextLanguage)?.nativeLabel ?? '';

  const switchLanguage = () => {
    void useAppStore.getState().setLocale(nextLanguage);
  };

  const sendCodeLabel = countdown > 0 ? t('auth.login.resend', { seconds: countdown }) : t('auth.login.sendCode');

  return (
    <ScrollView className="flex-1 bg-[#fff8f7]" contentContainerClassName="min-h-full items-center justify-center px-5 py-12">
      <View className="mb-6 flex-row items-center gap-1">
        <Text className="text-3xl text-[#720003]">▣</Text>
        <Text className="text-xl font-bold text-[#720003]">{t('app.name')}</Text>
      </View>

      <Card className="w-full max-w-md gap-6 shadow-[#961813]/5">
        <View className="items-center">
          <Text className="mb-1 text-3xl font-bold text-[#720003]">{t('auth.login.title')}</Text>
          <Text className="text-center text-sm text-[#59413d]">{t('auth.login.subtitle')}</Text>
        </View>

        <View className="flex-row border-b border-[#e1bfba]">
          <Pressable className="flex-1 py-4" onPress={() => setMode('password')}>
            <Text className={`text-center text-xs font-bold tracking-wider ${isPassword ? 'text-[#720003]' : 'text-[#59413d]'}`}>
              {t('auth.login.passwordTab')}
            </Text>
            {isPassword ? <View className="mt-3 h-[3px] rounded-full bg-[#720003]" /> : null}
          </Pressable>
          <Pressable className="flex-1 py-4" onPress={() => setMode('sms')}>
            <Text className={`text-center text-xs font-bold tracking-wider ${!isPassword ? 'text-[#720003]' : 'text-[#59413d]'}`}>
              {t('auth.login.smsTab')}
            </Text>
            {!isPassword ? <View className="mt-3 h-[3px] rounded-full bg-[#720003]" /> : null}
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
          <View className="gap-1.5">
            <Text className="ml-1 text-xs font-bold uppercase tracking-wider text-[#59413d]">
              {isPassword ? t('auth.login.passwordLabel') : t('auth.login.smsLabel')}
            </Text>
            {isPassword ? (
              <View className="min-h-14 flex-row items-center rounded-lg border border-[#e1bfba] bg-white">
                <View className="pl-5 pr-4">
                  <AppIcon color="#8d706c" name="lock" size={24} />
                </View>
                <TextInput
                  className="flex-1 px-2 py-3 text-base text-[#261816]"
                  placeholder={t('auth.login.passwordPlaceholder')}
                  placeholderTextColor="#8d706c"
                  secureTextEntry={!passwordVisible}
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable className="mr-2 pl-3 pr-5 py-3" onPress={() => setPasswordVisible((value) => !value)}>
                  <AppIcon color="#8d706c" name={passwordVisible ? 'eye' : 'eyeOff'} size={24} />
                </Pressable>
              </View>
            ) : (
              <View className="w-full flex-row items-center gap-3">
                <View className="min-h-14 flex-1 flex-row items-center rounded-lg border border-[#e1bfba] bg-white">
                  <TextInput
                    className="flex-1 pl-5 pr-3 py-3 text-base text-[#261816]"
                    keyboardType="number-pad"
                    placeholder={t('auth.login.smsPlaceholder')}
                    placeholderTextColor="#8d706c"
                    value={code}
                    onChangeText={setCode}
                  />
                </View>
                <Pressable
                  className={`rounded-full px-6 py-4 ${countdown > 0 ? 'bg-[#e1bfba]' : 'bg-[#720003]'}`}
                  disabled={countdown > 0}
                  onPress={() => void handleSendCode()}
                >
                  <Text className={`text-sm font-bold ${countdown > 0 ? 'text-[#8d706c]' : 'text-white'}`}>{sendCodeLabel}</Text>
                </Pressable>
              </View>
            )}
          </View>

          <Pressable className="items-end" onPress={() => setFeatureInProgressVisible(true)}>
            <Text className="text-[11px] font-bold text-[#720003]">{t('auth.login.forgotPassword')}</Text>
          </Pressable>

          <View className="flex-row items-start gap-2">
            <Switch onValueChange={setAccepted} value={accepted} />
            <Text className="flex-1 text-[13px] leading-5 text-[#59413d]">
              {t('auth.login.termsPrefix')}{' '}
              <Text className="font-semibold text-[#720003]" onPress={() => router.push('/terms')}>{t('auth.login.terms')}</Text>{' '}
              {t('auth.login.privacyPrefix')}{' '}
              <Text className="font-semibold text-[#720003]" onPress={() => router.push('/privacy')}>{t('auth.login.privacy')}</Text>.
            </Text>
          </View>

          <Button icon={<Text className="text-white">→</Text>} onPress={() => void handleLogin()}>{t('auth.login.submit')}</Button>
        </View>

        <View className="items-center pt-1">
          <Text className="text-sm text-[#59413d]">
            {t('auth.login.newHere')} <Text className="font-bold text-[#720003]" onPress={() => router.push('/(auth)/register')}>{t('auth.login.register')}</Text>
          </Text>
        </View>
      </Card>

      <View className="mt-8 flex-row items-center gap-6">
        <Pressable className="flex-row items-center gap-1.5" onPress={() => router.push('/help')}>
          <AppIcon color="#8d706c" name="help" size={14} />
          <Text className="text-[11px] font-bold text-[#8d706c]">{t('auth.login.help')}</Text>
        </Pressable>
        <View className="h-3 w-px bg-[#e1bfba]" />
        <Pressable className="flex-row items-center gap-1.5" onPress={switchLanguage}>
          <AppIcon color="#8d706c" name="language" size={14} />
          <Text className="text-[11px] font-bold text-[#8d706c]">{t('auth.login.languageSwitch', { language: nextLanguageLabel })}</Text>
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
