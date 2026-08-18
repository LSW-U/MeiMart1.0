import { colors } from "../../src/theme/colors";
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { SimplePageHeader } from '../../src/components/layout/SimplePageHeader';
import { AppIcon, Button, Input, UploadTile } from '../../src/components/ui';
import { useAuth } from '../../src/hooks/useAuth';
import { useTranslation } from '../../src/i18n/useTranslation';
import { isValidPhone } from '../../src/services/auth';
import { riderApi } from '../../src/services/user';

type UploadKey = 'license' | 'biFront' | 'biBack' | 'vehicle';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { login, mockLogin } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [codeState, setCodeState] = useState<'idle' | 'sent' | 'resend'>('idle');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [uploads, setUploads] = useState<Record<UploadKey, boolean>>({
    license: false,
    biFront: false,
    biBack: false,
    vehicle: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCodeLabel = codeState === 'idle' ? t('auth.register.sendCode') : codeState === 'sent' ? t('auth.register.sent') : t('auth.register.resend');

  const toggleUpload = (key: UploadKey) => {
    setUploads((current) => ({ ...current, [key]: !current[key] }));
  };

  const sendCode = async () => {
    // TODO: 调用 authApi.sendSmsCode
    setCodeState(codeState === 'idle' ? 'sent' : 'resend');
  };

  // Why: 骑手注册流程 = 先 customer 登录（提交申请要求 customer 角色） + 再申请骑手
  // 开发环境始终用 mock-login（后端无真实 SMS 服务）；生产环境用 SMS 登录
  const register = async () => {
    if (!name || !phone) {
      setError('请填写姓名和手机号');
      return;
    }
    if (!isValidPhone(phone)) {
      setError('手机号格式错误');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Step 1: 用 customer 角色登录（apply API 要求 customer 角色）
      if (__DEV__) {
        await mockLogin('customer');
      } else {
        if (!smsCode) {
          setError('请输入验证码');
          setLoading(false);
          return;
        }
        await login(phone, undefined, smsCode);
      }

      // Step 2: 骑手入驻申请
      await riderApi.apply({
        riderName: name,
        phone: phone.startsWith('+670') ? phone : `+670 ${phone}`,
        vehicleType: 'MOTORCYCLE',
        idCardNumber: licenseNumber || '0000000000',
      });

      // Step 3: 申请成功后，开发环境自动用 rider 登录（跳过审核）
      if (__DEV__) {
        await mockLogin('rider');
      }

      // Step 4: 跳转到任务页
      router.replace('/(main)/tasks');
    } catch (e) {
      console.error('[register] failed:', e);
      setError(e instanceof Error ? e.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <SimplePageHeader backLabel={t('common.back')} fallbackHref="/(auth)/login" title={t('auth.register.title')} />
      <ScrollView contentContainerClassName="items-center px-5 py-8 pb-10">
        <View className="w-full max-w-lg gap-12">
          <View className="flex-row items-center justify-between rounded-xl bg-primary px-6 py-5 shadow-md">
            <View className="flex-row items-center gap-3">
              <View className="rounded-lg bg-white/10 p-2">
                <AppIcon name="rider" className="text-2xl text-white" />
              </View>
              <View>
                <Text className="mb-1 text-[10px] font-bold uppercase leading-none tracking-wider text-white/80">{t('auth.register.partner')}</Text>
                <Text className="text-xl font-semibold text-white">{t('auth.register.role')}</Text>
              </View>
            </View>
            <Text className="text-2xl text-white/50">▣</Text>
          </View>

          <View className="gap-6">
            <View className="flex-row items-center gap-3 border-b border-outline-variant pb-2">
              <AppIcon name="profile" className="text-xl text-primary" />
              <Text className="text-xl font-semibold text-on-surface">{t('auth.register.personalDetails')}</Text>
            </View>
            <View className="gap-6">
              <Input label={t('auth.register.fullName')} placeholder={t('auth.register.fullNamePlaceholder')} value={name} onChangeText={setName} />
              <Input
                keyboardType="phone-pad"
                label={t('auth.register.phone')}
                leftSlot={<Text className="self-stretch border-r border-outline-variant bg-surface-container-low px-4 py-3 text-base text-on-surface-variant">+670</Text>}
                placeholder={t('auth.register.phonePlaceholder')}
                rightSlot={
                  <Pressable accessibilityRole="button" accessibilityLabel={sendCodeLabel} className={`items-center justify-center rounded-lg px-4 ${codeState === 'sent' ? 'bg-success-deep' : 'bg-primary'}`} onPress={sendCode}>
                    <Text className="text-[11px] font-bold text-white">{sendCodeLabel}</Text>
                  </Pressable>
                }
                className="px-2"
                value={phone}
                onChangeText={setPhone}
              />
              <Input keyboardType="number-pad" label={t('auth.register.verificationCode')} maxLength={6} placeholder={t('auth.register.smsPlaceholder')} value={smsCode} onChangeText={setSmsCode} />
              <Input label={t('auth.register.identityCard')} placeholder={t('auth.register.identityCardPlaceholder')} value={licenseNumber} onChangeText={setLicenseNumber} />
              <View className="gap-1.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('auth.register.homeAddress')}</Text>
                <TextInput
                  className="min-h-[100px] rounded-lg border border-outline-variant bg-white p-4 text-base text-on-surface"
                  multiline
                  placeholder={t('auth.register.homeAddressPlaceholder')}
                  placeholderTextColor={colors.outline}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          <View className="gap-6">
            <View className="flex-row items-center gap-3 border-b border-outline-variant pb-2">
              <AppIcon name="document" className="text-xl text-primary" />
              <Text className="text-xl font-semibold text-on-surface">{t('auth.register.documents')}</Text>
            </View>
            <Text className="-mt-4 text-sm text-on-surface-variant">{t('auth.register.documentsHint')}</Text>
            <View className="gap-4">
              <UploadTile icon="ID" selected={uploads.license} subtitle={t('auth.register.driverLicenseLocal')} title={t('auth.register.driverLicense')} t={t} onPress={() => toggleUpload('license')} />
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <UploadTile compact icon="ID" selected={uploads.biFront} title={t('auth.register.biFront')} t={t} onPress={() => toggleUpload('biFront')} />
                </View>
                <View className="flex-1">
                  <UploadTile compact icon="ID" selected={uploads.biBack} title={t('auth.register.biBack')} t={t} onPress={() => toggleUpload('biBack')} />
                </View>
              </View>
              <UploadTile icon="VR" selected={uploads.vehicle} subtitle={t('auth.register.vehicleRegistrationLocal')} title={t('auth.register.vehicleRegistration')} t={t} onPress={() => toggleUpload('vehicle')} />
            </View>
          </View>

          <View className="gap-6">
            <View className="flex-row items-center gap-3 border-b border-outline-variant pb-2">
              <AppIcon name="security" className="text-xl text-primary" />
              <Text className="text-xl font-semibold text-on-surface">{t('auth.register.security')}</Text>
            </View>
            <View className="gap-6">
              <Input label={t('auth.register.password')} placeholder="••••••••" secureTextEntry />
              <Input label={t('auth.register.confirmPassword')} placeholder="••••••••" secureTextEntry />
            </View>
          </View>

          <View className="rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-4">
            <View className="flex-row items-start gap-3">
              <Switch accessibilityRole="switch" accessibilityLabel={t('auth.login.agreeTerms')} accessibilityState={{ checked: accepted }} onValueChange={setAccepted} value={accepted} />
              <Text className="flex-1 text-sm leading-6 text-on-surface-variant">
                {t('auth.register.termsPrefix')} <Text className="font-bold text-primary">{t('auth.register.terms')}</Text>{' '}
                {t('auth.register.privacyPrefix')} <Text className="font-bold text-primary">{t('auth.register.privacy')}</Text> {t('auth.register.termsSuffix')}
              </Text>
            </View>
          </View>

          {/* 错误提示 */}
          {/* 审查修复 P2-2：原 bg-status-danger-bg 是幽灵 token（tailwind config 未定义，渲染空背景）→ 复用现有 danger-soft（#ffdad6 淡红底，≈原 bg-red-100） */}
          {error && (
            <View className="rounded-xl bg-danger-soft p-4">
              <Text className="text-sm text-status-danger-text">{error}</Text>
            </View>
          )}

          <View className="gap-6">
            <Button className="h-16 rounded-2xl" disabled={loading} loading={loading} textClassName="text-lg" onPress={() => void register()}>
              {loading ? t('flow.processing') : t('auth.register.submit')}
            </Button>
            <Text className="text-center text-sm text-on-surface-variant">
              {t('auth.register.alreadyHaveAccount')} <Text accessibilityRole="link" className="font-bold text-primary" onPress={() => router.push('/(auth)/login')}>{t('auth.register.login')}</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
