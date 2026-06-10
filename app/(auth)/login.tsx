import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { Button, Card, Input } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n/useTranslation';
import { startRiderSession } from '../../src/services/user';

type LoginMode = 'password' | 'sms';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<LoginMode>('password');
  const [accepted, setAccepted] = useState(false);

  const isPassword = mode === 'password';

  const login = async () => {
    await startRiderSession();
    router.replace('/(main)/tasks');
  };

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
          <Input keyboardType="phone-pad" label={t('auth.login.phoneLabel')} placeholder={t('auth.login.phonePlaceholder')} />
          <View className="gap-1.5">
            <Text className="ml-1 text-xs font-bold uppercase tracking-wider text-[#59413d]">
              {isPassword ? t('auth.login.passwordLabel') : t('auth.login.smsLabel')}
            </Text>
            <View className="min-h-14 flex-row items-center rounded-lg border border-[#8d706c] bg-[#fff0ee]">
              <Text className="px-4 text-[#8d706c]">{isPassword ? 'L' : 'C'}</Text>
              <TextInput
                className="flex-1 px-2 py-3 text-base text-[#261816]"
                keyboardType={isPassword ? 'default' : 'number-pad'}
                placeholder={isPassword ? t('auth.login.passwordPlaceholder') : t('auth.login.smsPlaceholder')}
                placeholderTextColor="#8d706c"
                secureTextEntry={isPassword}
              />
              {isPassword ? <Text className="px-4 text-[#8d706c]">V</Text> : null}
            </View>
          </View>

          <Pressable className="items-end">
            <Text className="text-[11px] font-bold text-[#720003]">{t('auth.login.forgotPassword')}</Text>
          </Pressable>

          <View className="flex-row items-start gap-2">
            <Switch onValueChange={setAccepted} value={accepted} />
            <Text className="flex-1 text-[13px] leading-5 text-[#59413d]">
              {t('auth.login.termsPrefix')} <Text className="font-semibold text-[#720003]">{t('auth.login.terms')}</Text>{' '}
              {t('auth.login.privacyPrefix')} <Text className="font-semibold text-[#720003]">{t('auth.login.privacy')}</Text>.
            </Text>
          </View>

          <Button icon={<Text className="text-white">→</Text>} onPress={() => void login()}>{t('auth.login.submit')}</Button>
        </View>

        <View className="items-center pt-1">
          <Text className="text-sm text-[#59413d]">
            {t('auth.login.newHere')} <Text className="font-bold text-[#720003]" onPress={() => router.push('/(auth)/register')}>{t('auth.login.register')}</Text>
          </Text>
        </View>
      </Card>

      <View className="mt-8 flex-row items-center gap-6">
        <Text className="text-[11px] font-bold text-[#8d706c]">? {t('auth.login.help')}</Text>
        <View className="h-3 w-px bg-[#e1bfba]" />
        <Text className="text-[11px] font-bold text-[#8d706c]">◎ {t('auth.login.language')}</Text>
      </View>
    </ScrollView>
  );
}
