import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SimplePageHeader } from '../../src/components/layout/SimplePageHeader';
import { showToast } from '../../src/components/feedback/Toast';
import { AppIcon, Button, Input, UploadTile } from '../../src/components/ui';
import { useAuth } from '../../src/hooks/useAuth';
import { useTranslation } from '../../src/i18n/useTranslation';
import type { TranslationKey } from '../../src/i18n/useTranslation';
import { ApiError } from '../../src/services/api';
import { isValidPhone } from '../../src/services/auth';
import { riderApi } from '../../src/services/user';
import type { VehicleType } from '../../src/types/rider';

type UploadKey = 'license' | 'biFront' | 'biBack' | 'vehicle';

// §6④ A：三选一 SegmentedControl 选项（套用 app/order/history.tsx:76-95 范式，0 新组件）
const vehicleOptions: { value: VehicleType; labelKey: TranslationKey }[] = [
  { value: 'MOTORCYCLE', labelKey: 'auth.register.vehicleMotorcycle' },
  { value: 'BICYCLE', labelKey: 'auth.register.vehicleBicycle' },
  { value: 'CAR', labelKey: 'auth.register.vehicleCar' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  // §3.3：补 sendSmsCode + isSmsPending（hook 层已暴露）
  const { login, mockLogin, sendSmsCode, isSmsPending } = useAuth();

  // §3.1：收敛后受控值（删死字段 + licenseNumber→idCardNumber 改名 §6⑧ A）
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('MOTORCYCLE');
  const [uploads, setUploads] = useState<Record<UploadKey, boolean>>({
    license: false,
    biFront: false,
    biBack: false,
    vehicle: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [countdown, setCountdown] = useState(0);

  // §3.3：60s 倒计时（useEffect + setTimeout 递减链，自带清理）
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendCodeLabel =
    countdown > 0 ? t('auth.register.resend', { seconds: countdown }) : t('auth.register.sendCode');

  const toggleUpload = (key: UploadKey) => {
    setUploads((current) => ({ ...current, [key]: !current[key] }));
  };

  // §3.2：手写校验（同 A1 模式，§6① A）
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('auth.register.error.nameRequired');
    if (!phone) e.phone = t('auth.register.error.phoneRequired');
    else if (!isValidPhone(phone)) e.phone = t('auth.register.error.phoneInvalid');
    // DEV 走 mockLogin 不需验证码；prod 才校验（沿用现状 __DEV__ 分支）
    if (!__DEV__ && !smsCode) e.smsCode = t('auth.register.error.codeRequired');
    // §6③ A：idCardNumber 必填 + min 6（BI 号 7 位，防少填误提交）
    if (!idCardNumber) e.idCard = t('auth.register.error.idCardRequired');
    else if (idCardNumber.length < 6) e.idCard = t('auth.register.error.idCardTooShort');
    if (!accepted) e.terms = t('auth.register.error.termsRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // 审查 P2-1（同源）：用户输入/勾选时清除对应字段的 error，避免红字残留到下次提交。
  const clearFieldError = (field: string) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  // §3.3：sendCode 接线（删 codeState 假交互 → 调真实 sendSmsCode + 倒计时 + catch 区分）
  const sendCode = async () => {
    // 前置校验：phone 必填 + 格式（拦截 authApi.sendSmsCode 内部裸 Error('invalid_phone') 路径）
    if (!phone) {
      setErrors((p) => ({ ...p, phone: t('auth.register.error.phoneRequired') }));
      return;
    }
    if (!isValidPhone(phone)) {
      setErrors((p) => ({ ...p, phone: t('auth.register.error.phoneInvalid') }));
      return;
    }
    try {
      // isValidPhone 内部已 strip 空格，传 '7700 0000' 原样即可，无需手动拼 +670 前缀
      await sendSmsCode(phone);
      setCountdown(60);
      showToast(t('auth.register.codeSentToast'), 'success');
    } catch (err) {
      // 入口已前置 isValidPhone，catch 实际只命中：
      //   ApiError（real 模式后端拒绝/网络层失败，api.ts:151）→ codeSendFailed
      //   非 ApiError 兜底（理论 mock 异常等）→ networkError
      const msg = err instanceof ApiError ? t('auth.register.codeSendFailed') : t('common.networkError');
      showToast(msg, 'error');
    }
  };

  // Why: 骑手注册流程 = 先 customer 登录（apply 要求 customer 角色） + 再申请骑手
  // 开发环境始终用 mock-login（后端无真实 SMS 服务）；生产环境用 SMS 登录
  const register = async () => {
    // §3.4：inline 拦截，不调后端
    if (!validate()) return;
    setLoading(true);
    try {
      // Step 1: 用 customer 角色登录（apply API 要求 customer 角色）
      if (__DEV__) {
        await mockLogin('customer');
      } else {
        await login(phone, undefined, smsCode);
      }

      // Step 2: 骑手入驻申请
      await riderApi.apply({
        riderName: name.trim(),
        phone: phone.startsWith('+670') ? phone : `+670 ${phone}`,
        vehicleType, // 用户所选，不再写死
        idCardNumber, // 不再兜底 '0000000000'
      });

      // Step 3: 申请成功后，开发环境自动用 rider 登录（跳过审核）
      if (__DEV__) {
        await mockLogin('rider');
      }

      // Step 4: 跳转到任务页（DEV customer 登录不跳转，此处显式跳转对 customer→apply→rider 流程必要）
      router.replace('/(main)/tasks');
    } catch (err) {
      // §6⑦ A：固定文案，与 A1 login catch 对齐（弱网可控，不透传后端 message）
      const msg = err instanceof ApiError ? t('auth.register.failed') : t('common.networkError');
      showToast(msg, 'error');
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
              <Input label={t('auth.register.fullName')} placeholder={t('auth.register.fullNamePlaceholder')} value={name} onChangeText={(v) => { setName(v); clearFieldError('name'); }} error={errors.name} />
              <Input
                keyboardType="phone-pad"
                label={t('auth.register.phone')}
                leftSlot={<Text className="self-stretch border-r border-outline-variant bg-surface-container-low px-4 py-3 text-base text-on-surface-variant">+670</Text>}
                placeholder={t('auth.register.phonePlaceholder')}
                rightSlot={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={sendCodeLabel}
                    accessibilityState={{ disabled: countdown > 0 || isSmsPending }}
                    className={`items-center justify-center rounded-lg px-4 ${countdown > 0 ? 'bg-success-deep' : 'bg-primary'}`}
                    disabled={countdown > 0 || isSmsPending}
                    onPress={() => void sendCode()}
                  >
                    <Text className="text-[11px] font-bold text-white">{isSmsPending ? t('flow.processing') : sendCodeLabel}</Text>
                  </Pressable>
                }
                className="px-2"
                value={phone}
                onChangeText={(v) => { setPhone(v); clearFieldError('phone'); }}
                error={errors.phone}
              />
              <Input
                keyboardType="number-pad"
                label={t('auth.register.verificationCode')}
                maxLength={6}
                placeholder={t('auth.register.smsPlaceholder')}
                value={smsCode}
                onChangeText={(v) => { setSmsCode(v); clearFieldError('smsCode'); }}
                error={errors.smsCode}
              />
              <Input
                label={t('auth.register.identityCard')}
                placeholder={t('auth.register.identityCardPlaceholder')}
                value={idCardNumber}
                onChangeText={(v) => { setIdCardNumber(v); clearFieldError('idCard'); }}
                error={errors.idCard}
              />
              {/* §6④ A：vehicleType 三选一 SegmentedControl（套用 history.tsx:76-95 范式） */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('auth.register.vehicleType')}</Text>
                <View className="flex-row gap-2">
                  {vehicleOptions.map((opt) => {
                    const active = vehicleType === opt.value;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t(opt.labelKey)}
                        accessibilityState={{ selected: active }}
                        key={opt.value}
                        className={`flex-1 items-center justify-center rounded-lg border px-2 py-3 ${active ? 'border-primary bg-primary' : 'border-outline-variant bg-surface'}`}
                        onPress={() => setVehicleType(opt.value)}
                      >
                        <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-on-surface-variant'}`}>{t(opt.labelKey)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          <View className="gap-6">
            <View className="flex-row items-center gap-3 border-b border-outline-variant pb-2">
              <AppIcon name="document" className="text-xl text-primary" />
              <Text className="text-xl font-semibold text-on-surface">{t('auth.register.documents')}</Text>
            </View>
            <Text className="-mt-4 text-sm text-on-surface-variant">{t('auth.register.documentsHint')}</Text>
            {/* §6⑥ A：假上传保留现状，真实上传归 P2 资料编辑 */}
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

          <View className="rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-4">
            <View className="flex-row items-start gap-3">
              <Switch accessibilityRole="switch" accessibilityLabel={t('auth.login.agreeTerms')} accessibilityState={{ checked: accepted }} onValueChange={(v) => { setAccepted(v); clearFieldError('terms'); }} value={accepted} />
              <View className="flex-1">
                <Text className="text-sm leading-6 text-on-surface-variant">
                  {t('auth.register.termsPrefix')} <Text className="font-bold text-primary">{t('auth.register.terms')}</Text>{' '}
                  {t('auth.register.privacyPrefix')} <Text className="font-bold text-primary">{t('auth.register.privacy')}</Text> {t('auth.register.termsSuffix')}
                </Text>
                {/* §6② A：协议未勾选 inline 红字（Switch 下方，与字段错误一致） */}
                {errors.terms ? <Text className="mt-1 text-xs text-error">{errors.terms}</Text> : null}
              </View>
            </View>
          </View>

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
