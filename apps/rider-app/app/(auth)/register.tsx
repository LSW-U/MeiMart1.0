import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { SimplePageHeader } from '../../src/components/layout/SimplePageHeader';
import { showToast } from '../../src/components/feedback/Toast';
import { AppIcon, Button, Input, UploadTile } from '../../src/components/ui';
import { useAuth } from '../../src/hooks/useAuth';
import { useTranslation } from '../../src/i18n/useTranslation';
import type { TranslationKey } from '../../src/i18n/useTranslation';
import { ApiError } from '../../src/services/api';
import { isValidPhone } from '../../src/services/auth';
import { riderApi } from '../../src/services/user';
import { riderUploadApi } from '../../src/services/upload';
import { precheckImage, PrecheckError } from '@meimart/upload-core';
import type { VehicleType } from '../../src/types/rider';

type UploadKey = 'license' | 'biFront' | 'biBack' | 'vehicle';

// upload 模块批A（2026-09-09）：上传位状态从 boolean 改为 'idle' | 'uploading' | 'done'
// （选中=已上传成功；UploadTile selected 即绿色 ✓ 态，上传中无专用 UI，用 disabled 防重入）
// 批B（U4）：加 'error' 态——UploadTile 红框 + 重试文案，再点即重新选图上传
type UploadState = 'idle' | 'uploading' | 'done' | 'error';

// 上传位 → 后端端点 + apply payload 字段映射（决策 2026-09-09 用户拍板「正面+驾驶证落库」）：
//   biFront → id-card-image → idCardImageUrl（BI 正面落库）
//   license → license-image → licenseImageUrl（驾驶证落库）
//   biBack / vehicle → 后端暂无独立 URL 字段（RiderProfile 仅 avatarUrl/idCardImageUrl/licenseImageUrl
//   3 个），走真实端点上传成功即反馈（后续有字段再落库）；biBack 归 id-card-image、vehicle 归 license-image。
const UPLOAD_ENDPOINTS = {
  license: { upload: riderUploadApi.licenseImage, field: 'licenseImageUrl' as const },
  biFront: { upload: riderUploadApi.idCardImage, field: 'idCardImageUrl' as const },
  biBack: { upload: riderUploadApi.idCardImage, field: null },
  vehicle: { upload: riderUploadApi.licenseImage, field: null },
} as const;

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
  const [uploads, setUploads] = useState<Record<UploadKey, UploadState>>({
    license: 'idle',
    biFront: 'idle',
    biBack: 'idle',
    vehicle: 'idle',
  });
  // 已上传成功的 URL（仅落库位：licenseImageUrl/idCardImageUrl；biBack/vehicle 上传成功即反馈）
  const [uploadUrls, setUploadUrls] = useState<{
    licenseImageUrl?: string;
    idCardImageUrl?: string;
  }>({});
  // 批B（U4）：失败态提示（按上传位存，error 态 UploadTile 渲染；成功/重选时清除）
  const [uploadHints, setUploadHints] = useState<Partial<Record<UploadKey, string>>>({});
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

  // upload 模块批A：假上传（boolean 切换）→ 真上传（选图 → 端点上传 → URL 存 state）
  // 上传中防重入；批B（U4）：失败回 'error' 态（UploadTile 红框 + 重试），再点即重选上传；
  // 批B（A4）：选图后先走 document 场景预校验（≥300×200，与后端同码），有尺寸元数据才校验
  const handleUpload = async (key: UploadKey) => {
    const current = uploads[key];
    if (current === 'uploading') return;
    const conf = UPLOAD_ENDPOINTS[key];
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    // A4 预校验（document：minWidth 300 + minHeight 200 任意比例，E-UPLOAD-022）；
    // 测试 mock asset 无 width/height 时跳过（与后端兜底一致）
    if ((asset.width ?? 0) > 0 && (asset.height ?? 0) > 0) {
      try {
        precheckImage('document', {
          mimeType: asset.mimeType,
          sizeBytes: asset.fileSize ?? null,
          width: asset.width ?? 0,
          height: asset.height ?? 0,
        });
      } catch (err) {
        if (err instanceof PrecheckError) {
          // t() 的 key 类型是封闭 union，动态 code 用模板串断言（code 均来自 SCENE_RULES 预置表）
          const hint = t(`errors.${err.code}` as TranslationKey, { defaultValue: err.message });
          setUploads((prev) => ({ ...prev, [key]: 'error' }));
          setUploadHints((prev) => ({ ...prev, [key]: hint }));
          showToast(hint, 'error');
          return;
        }
        throw err;
      }
    }
    setUploads((prev) => ({ ...prev, [key]: 'uploading' }));
    setUploadHints((prev) => ({ ...prev, [key]: undefined }));
    try {
      const uploaded = await conf.upload(asset.uri, asset.mimeType ?? 'image/jpeg');
      if (conf.field) {
        setUploadUrls((prev) => ({ ...prev, [conf.field]: uploaded.url }));
      }
      setUploads((prev) => ({ ...prev, [key]: 'done' }));
      showToast(t('common.uploadSuccess'), 'success');
    } catch (err) {
      // 上传失败回 error 态（UploadTile 红框 + hint，再点重试）；ApiError 透传后端
      // E-UPLOAD 文案 message（已本地化），否则固定文案
      setUploads((prev) => ({ ...prev, [key]: 'error' }));
      setUploadHints((prev) => ({
        ...prev,
        [key]: err instanceof Error && err.message ? err.message : t('auth.register.uploadFailed'),
      }));
      const msg =
        err instanceof Error && err.message ? err.message : t('auth.register.uploadFailed');
      showToast(msg, 'error');
    }
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
      const msg =
        err instanceof ApiError ? t('auth.register.codeSendFailed') : t('common.networkError');
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

      // Step 2: 骑手入驻申请（upload 模块批A：payload 带已上传的证件 URL——
      //   idCardImageUrl=BI 正面 / licenseImageUrl=驾驶证；URL 字段 optional，未上传不阻断申请）
      await riderApi.apply({
        riderName: name.trim(),
        phone: phone.startsWith('+670') ? phone : `+670 ${phone}`,
        vehicleType, // 用户所选，不再写死
        idCardNumber, // 不再兜底 '0000000000'
        idCardImageUrl: uploadUrls.idCardImageUrl,
        licenseImageUrl: uploadUrls.licenseImageUrl,
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
      <SimplePageHeader
        backLabel={t('common.back')}
        fallbackHref="/(auth)/login"
        title={t('auth.register.title')}
      />
      <ScrollView contentContainerClassName="items-center px-5 py-8 pb-10">
        <View className="w-full max-w-lg gap-12">
          <View className="flex-row items-center justify-between rounded-xl bg-primary px-6 py-5 shadow-md">
            <View className="flex-row items-center gap-3">
              <View className="rounded-lg bg-white/10 p-2">
                <AppIcon name="rider" className="text-2xl text-white" />
              </View>
              <View>
                <Text className="mb-1 text-[10px] font-bold uppercase leading-none tracking-wider text-white/80">
                  {t('auth.register.partner')}
                </Text>
                <Text className="text-xl font-semibold text-white">{t('auth.register.role')}</Text>
              </View>
            </View>
            <Text className="text-2xl text-white/50">▣</Text>
          </View>

          <View className="gap-6">
            <View className="flex-row items-center gap-3 border-b border-outline-variant pb-2">
              <AppIcon name="profile" className="text-xl text-primary" />
              <Text className="text-xl font-semibold text-on-surface">
                {t('auth.register.personalDetails')}
              </Text>
            </View>
            <View className="gap-6">
              <Input
                label={t('auth.register.fullName')}
                placeholder={t('auth.register.fullNamePlaceholder')}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  clearFieldError('name');
                }}
                error={errors.name}
              />
              <Input
                keyboardType="phone-pad"
                label={t('auth.register.phone')}
                leftSlot={
                  <Text className="self-stretch border-r border-outline-variant bg-surface-container-low px-4 py-3 text-base text-on-surface-variant">
                    +670
                  </Text>
                }
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
                    <Text className="text-[11px] font-bold text-white">
                      {isSmsPending ? t('flow.processing') : sendCodeLabel}
                    </Text>
                  </Pressable>
                }
                className="px-2"
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  clearFieldError('phone');
                }}
                error={errors.phone}
              />
              <Input
                keyboardType="number-pad"
                label={t('auth.register.verificationCode')}
                maxLength={6}
                placeholder={t('auth.register.smsPlaceholder')}
                value={smsCode}
                onChangeText={(v) => {
                  setSmsCode(v);
                  clearFieldError('smsCode');
                }}
                error={errors.smsCode}
              />
              <Input
                label={t('auth.register.identityCard')}
                placeholder={t('auth.register.identityCardPlaceholder')}
                value={idCardNumber}
                onChangeText={(v) => {
                  setIdCardNumber(v);
                  clearFieldError('idCard');
                }}
                error={errors.idCard}
              />
              {/* §6④ A：vehicleType 三选一 SegmentedControl（套用 history.tsx:76-95 范式） */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {t('auth.register.vehicleType')}
                </Text>
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
                        <Text
                          className={`text-xs font-bold ${active ? 'text-white' : 'text-on-surface-variant'}`}
                        >
                          {t(opt.labelKey)}
                        </Text>
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
              <Text className="text-xl font-semibold text-on-surface">
                {t('auth.register.documents')}
              </Text>
            </View>
            <Text className="-mt-4 text-sm text-on-surface-variant">
              {t('auth.register.documentsHint')}
            </Text>
            {/* upload 模块批A：假上传改真上传（选图→上传→URL 填 apply payload）。
                上传中 disabled 防重入；selected=上传成功（绿色 ✓ 态复用现有 UI）。
                批B（U4）：error=失败红框 + 重试文案 + hint，再点即重选上传。 */}
            <View className="gap-4">
              <UploadTile
                error={uploads.license === 'error'}
                errorHint={uploadHints.license}
                icon="ID"
                selected={uploads.license === 'done'}
                disabled={uploads.license === 'uploading'}
                subtitle={t('auth.register.driverLicenseLocal')}
                title={t('auth.register.driverLicense')}
                t={t}
                onPress={() => void handleUpload('license')}
              />
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <UploadTile
                    compact
                    error={uploads.biFront === 'error'}
                    errorHint={uploadHints.biFront}
                    icon="ID"
                    selected={uploads.biFront === 'done'}
                    disabled={uploads.biFront === 'uploading'}
                    title={t('auth.register.biFront')}
                    t={t}
                    onPress={() => void handleUpload('biFront')}
                  />
                </View>
                <View className="flex-1">
                  <UploadTile
                    compact
                    error={uploads.biBack === 'error'}
                    errorHint={uploadHints.biBack}
                    icon="ID"
                    selected={uploads.biBack === 'done'}
                    disabled={uploads.biBack === 'uploading'}
                    title={t('auth.register.biBack')}
                    t={t}
                    onPress={() => void handleUpload('biBack')}
                  />
                </View>
              </View>
              <UploadTile
                error={uploads.vehicle === 'error'}
                errorHint={uploadHints.vehicle}
                icon="VR"
                selected={uploads.vehicle === 'done'}
                disabled={uploads.vehicle === 'uploading'}
                subtitle={t('auth.register.vehicleRegistrationLocal')}
                title={t('auth.register.vehicleRegistration')}
                t={t}
                onPress={() => void handleUpload('vehicle')}
              />
            </View>
          </View>

          <View className="rounded-xl border border-outline-variant/30 bg-surface-container-low/50 p-4">
            <View className="flex-row items-start gap-3">
              <Switch
                accessibilityRole="switch"
                accessibilityLabel={t('auth.login.agreeTerms')}
                accessibilityState={{ checked: accepted }}
                onValueChange={(v) => {
                  setAccepted(v);
                  clearFieldError('terms');
                }}
                value={accepted}
              />
              <View className="flex-1">
                <Text className="text-sm leading-6 text-on-surface-variant">
                  {t('auth.register.termsPrefix')}{' '}
                  <Text className="font-bold text-primary">{t('auth.register.terms')}</Text>{' '}
                  {t('auth.register.privacyPrefix')}{' '}
                  <Text className="font-bold text-primary">{t('auth.register.privacy')}</Text>{' '}
                  {t('auth.register.termsSuffix')}
                </Text>
                {/* §6② A：协议未勾选 inline 红字（Switch 下方，与字段错误一致） */}
                {errors.terms ? (
                  <Text className="mt-1 text-xs text-error">{errors.terms}</Text>
                ) : null}
              </View>
            </View>
          </View>

          <View className="gap-6">
            <Button
              className="h-16 rounded-2xl"
              disabled={loading}
              loading={loading}
              textClassName="text-lg"
              onPress={() => void register()}
            >
              {loading ? t('flow.processing') : t('auth.register.submit')}
            </Button>
            <Text className="text-center text-sm text-on-surface-variant">
              {t('auth.register.alreadyHaveAccount')}{' '}
              <Text
                accessibilityRole="link"
                className="font-bold text-primary"
                onPress={() => router.push('/(auth)/login')}
              >
                {t('auth.register.login')}
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
