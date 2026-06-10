import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { PageHeader } from '../../src/components/layout/PageHeader';
import { Button, Input } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n/useTranslation';

type UploadKey = 'license' | 'biFront' | 'biBack' | 'vehicle';

type UploadTileProps = {
  title: string;
  subtitle?: string;
  icon: string;
  selected: boolean;
  compact?: boolean;
  onPress: () => void;
};

function UploadTile({ title, subtitle, icon, selected, compact, onPress }: UploadTileProps) {
  return (
    <Pressable
      className={`${compact ? 'h-24 flex-col justify-center gap-2' : 'min-h-14 flex-row justify-between'} items-center rounded-xl border p-4 ${selected ? 'border-[#720003] bg-[#720003]/5' : 'border-[#e1bfba] bg-white'}`}
      onPress={onPress}
    >
      <View className={`${compact ? 'items-center' : 'flex-row items-center gap-3'}`}>
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-[#ffe9e6]">
          <Text className="text-xl text-[#720003]">{icon}</Text>
        </View>
        <View className={compact ? 'items-center' : ''}>
          <Text className="text-[10px] font-bold uppercase tracking-wider text-[#59413d]">{title}</Text>
          {subtitle ? <Text className={`text-sm font-semibold ${selected ? 'text-[#720003]' : 'text-[#261816]'}`}>{subtitle}</Text> : null}
        </View>
      </View>
      {!compact ? <Text className={`text-xl ${selected ? 'text-[#720003]' : 'text-[#8d706c]'}`}>{selected ? '✓' : 'CAM'}</Text> : null}
    </Pressable>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);
  const [codeState, setCodeState] = useState<'idle' | 'sent' | 'resend'>('idle');
  const [uploads, setUploads] = useState<Record<UploadKey, boolean>>({
    license: false,
    biFront: false,
    biBack: false,
    vehicle: false,
  });

  const sendCodeLabel = codeState === 'idle' ? t('auth.register.sendCode') : codeState === 'sent' ? t('auth.register.sent') : t('auth.register.resend');

  const toggleUpload = (key: UploadKey) => {
    setUploads((current) => ({ ...current, [key]: !current[key] }));
  };

  const sendCode = () => {
    setCodeState(codeState === 'idle' ? 'sent' : 'resend');
  };

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <PageHeader title={t('auth.register.title')} />
      <ScrollView contentContainerClassName="items-center px-5 py-8 pb-10">
        <View className="w-full max-w-lg gap-12">
          <View className="flex-row items-center justify-between rounded-xl bg-[#720003] px-6 py-5 shadow-md">
            <View className="flex-row items-center gap-3">
              <View className="rounded-lg bg-white/10 p-2">
                <Text className="text-2xl text-white">M</Text>
              </View>
              <View>
                <Text className="mb-1 text-[10px] font-bold uppercase leading-none tracking-wider text-white/80">{t('auth.register.partner')}</Text>
                <Text className="text-xl font-semibold text-white">{t('auth.register.role')}</Text>
              </View>
            </View>
            <Text className="text-2xl text-white/50">▣</Text>
          </View>

          <View className="gap-6">
            <View className="flex-row items-center gap-3 border-b border-[#e1bfba] pb-2">
              <Text className="text-xl text-[#720003]">P</Text>
              <Text className="text-xl font-semibold text-[#261816]">{t('auth.register.personalDetails')}</Text>
            </View>
            <View className="gap-6">
              <Input label={t('auth.register.fullName')} placeholder={t('auth.register.fullNamePlaceholder')} />
              <View className="gap-1.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-[#59413d]">{t('auth.register.phone')}</Text>
                <View className="h-14 flex-row gap-2">
                  <View className="flex-1 flex-row rounded-lg border border-[#e1bfba] bg-white">
                    <Text className="border-r border-[#e1bfba] bg-[#fff0ee] px-4 py-4 text-[#59413d]">+670</Text>
                    <TextInput className="flex-1 px-4 text-base text-[#261816]" keyboardType="phone-pad" placeholder={t('auth.register.phonePlaceholder')} placeholderTextColor="#8d706c" />
                  </View>
                  <Pressable className={`items-center justify-center rounded-lg px-4 ${codeState === 'sent' ? 'bg-green-700' : 'bg-[#720003]'}`} onPress={sendCode}>
                    <Text className="text-[11px] font-bold text-white">{sendCodeLabel}</Text>
                  </Pressable>
                </View>
              </View>
              <Input keyboardType="number-pad" label={t('auth.register.verificationCode')} maxLength={6} placeholder={t('auth.register.smsPlaceholder')} />
              <Input label={t('auth.register.identityCard')} placeholder={t('auth.register.identityCardPlaceholder')} />
              <View className="gap-1.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-[#59413d]">{t('auth.register.homeAddress')}</Text>
                <TextInput
                  className="min-h-[100px] rounded-lg border border-[#e1bfba] bg-white p-4 text-base text-[#261816]"
                  multiline
                  placeholder={t('auth.register.homeAddressPlaceholder')}
                  placeholderTextColor="#8d706c"
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          <View className="gap-6">
            <View className="flex-row items-center gap-3 border-b border-[#e1bfba] pb-2">
              <Text className="text-xl text-[#720003]">D</Text>
              <Text className="text-xl font-semibold text-[#261816]">{t('auth.register.documents')}</Text>
            </View>
            <Text className="-mt-4 text-sm text-[#59413d]">{t('auth.register.documentsHint')}</Text>
            <View className="gap-4">
              <UploadTile icon="ID" selected={uploads.license} subtitle={t('auth.register.driverLicenseLocal')} title={t('auth.register.driverLicense')} onPress={() => toggleUpload('license')} />
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <UploadTile compact icon="ID" selected={uploads.biFront} title={t('auth.register.biFront')} onPress={() => toggleUpload('biFront')} />
                </View>
                <View className="flex-1">
                  <UploadTile compact icon="ID" selected={uploads.biBack} title={t('auth.register.biBack')} onPress={() => toggleUpload('biBack')} />
                </View>
              </View>
              <UploadTile icon="VR" selected={uploads.vehicle} subtitle={t('auth.register.vehicleRegistrationLocal')} title={t('auth.register.vehicleRegistration')} onPress={() => toggleUpload('vehicle')} />
            </View>
          </View>

          <View className="gap-6">
            <View className="flex-row items-center gap-3 border-b border-[#e1bfba] pb-2">
              <Text className="text-xl text-[#720003]">S</Text>
              <Text className="text-xl font-semibold text-[#261816]">{t('auth.register.security')}</Text>
            </View>
            <View className="gap-6">
              <Input label={t('auth.register.password')} placeholder="••••••••" secureTextEntry />
              <Input label={t('auth.register.confirmPassword')} placeholder="••••••••" secureTextEntry />
            </View>
          </View>

          <View className="rounded-xl border border-[#e1bfba]/30 bg-[#fff0ee]/50 p-4">
            <View className="flex-row items-start gap-3">
              <Switch onValueChange={setAccepted} value={accepted} />
              <Text className="flex-1 text-sm leading-6 text-[#59413d]">
                {t('auth.register.termsPrefix')} <Text className="font-bold text-[#720003]">{t('auth.register.terms')}</Text>{' '}
                {t('auth.register.privacyPrefix')} <Text className="font-bold text-[#720003]">{t('auth.register.privacy')}</Text> {t('auth.register.termsSuffix')}
              </Text>
            </View>
          </View>

          <View className="gap-6">
            <Button className="h-16 rounded-2xl" textClassName="text-lg" icon={<Text className="text-lg text-white">→</Text>}>
              {t('auth.register.submit')}
            </Button>
            <Text className="text-center text-sm text-[#59413d]">
              {t('auth.register.alreadyHaveAccount')} <Text className="font-bold text-[#720003]" onPress={() => router.push('/(auth)/login')}>{t('auth.register.login')}</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
