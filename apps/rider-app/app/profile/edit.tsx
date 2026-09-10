import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { SimplePageHeader } from '../../src/components/layout/SimplePageHeader';
import { showToast } from '../../src/components/feedback/Toast';
import { AppIcon, Button, Input, UploadTile } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n/useTranslation';
import type { TranslationKey } from '../../src/i18n/useTranslation';
import { ApiError } from '../../src/services/api';
import { isValidPhone } from '../../src/services/auth';
import { useUpdateProfile } from '../../src/services/queries/useRider';
import { riderUploadApi } from '../../src/services/upload';
import { precheckImage, PrecheckError } from '@meimart/upload-core';
import { useAuthStore } from '../../src/store/useAuthStore';
import type { VehicleType } from '../../src/types/rider';

type UploadKey = 'license' | 'biFront' | 'biBack' | 'vehicle';

// upload 模块批A（2026-09-09）：上传位状态从 boolean 改为三态（与 register.tsx 同构）
// 批B（U4）：加 'error' 态——UploadTile 红框 + 重试文案，再点即重新选图上传
type UploadState = 'idle' | 'uploading' | 'done' | 'error';

// 上传位 → 端点 + PATCH payload 字段映射（决策 2026-09-09 用户拍板「正面+驾驶证落库」，同 register）
const UPLOAD_ENDPOINTS = {
  license: { upload: riderUploadApi.licenseImage, field: 'licenseImageUrl' as const },
  biFront: { upload: riderUploadApi.idCardImage, field: 'idCardImageUrl' as const },
  biBack: { upload: riderUploadApi.idCardImage, field: null },
  vehicle: { upload: riderUploadApi.licenseImage, field: null },
} as const;

// P2 §3.6/§6④：vehicleType 三选一（套用 register.tsx:19-23 + history.tsx:76-95 范式）
const vehicleOptions: { value: VehicleType; labelKey: TranslationKey }[] = [
  { value: 'MOTORCYCLE', labelKey: 'profile.vehicleMotorcycle' },
  { value: 'BICYCLE', labelKey: 'profile.vehicleBicycle' },
  { value: 'CAR', labelKey: 'profile.vehicleCar' },
];

// P2 §3.2：手写校验表单（同 A1/A2 路线，全仓零 RHF）
type EditForm = {
  riderName: string;
  phone: string; // 不含 +670 前缀
  vehicleType: VehicleType | '';
  vehiclePlate: string;
  idCardNumber: string; // 只读展示，RiderProfile 无此字段，不可提交
};

type FormErrors = Partial<Record<keyof EditForm, string>>;

export default function ProfileEditPage() {
  const router = useRouter();
  const { t } = useTranslation();

  // P2 §3.1：real 模式（配了后端但 update 不支持）整页降级只读。
  // upload 模块批A（2026-09-09）：riderApi.updateProfile 已接真 PATCH /rider/profile（后端 W3 就绪），
  // editable 不再锁 isMockMode——mock/real 均可编辑（real 提交走真实端点，失败留页可重试）。
  const editable = true;

  const [form, setForm] = useState<EditForm>({
    riderName: '',
    phone: '',
    vehicleType: '',
    vehiclePlate: '',
    idCardNumber: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploads, setUploads] = useState<Record<UploadKey, UploadState>>({
    license: 'idle',
    biFront: 'idle',
    biBack: 'idle',
    vehicle: 'idle',
  });
  // 已上传成功的证件 URL（编辑页改动即时生效语义：保存时随 PATCH 提交；决策同 register「正面+驾驶证落库」）
  const [uploadUrls, setUploadUrls] = useState<{
    licenseImageUrl?: string;
    idCardImageUrl?: string;
  }>({});
  // 批B（U4）：失败态提示（按上传位存，error 态 UploadTile 渲染；成功/重选时清除）
  const [uploadHints, setUploadHints] = useState<Partial<Record<UploadKey, string>>>({});

  const rider = useAuthStore((s) => s.rider);
  const updateProfile = useUpdateProfile();

  // P2 §3.3：rider hydrate 后批量初始化表单（B 阶段 RHF + key reset 后整体移除）
  useEffect(() => {
    if (rider) {
      // Why 无 eslint-disable react-hooks/set-state-in-effect 指令（批B 收尾二分实测）：
      // 本配置（eslint-plugin-react-hooks 7.1.1）下，同文件 handleUpload 的「catch 内 setState」模式
      // 会使该规则对此文件整体降级，hydrate 初始化 setForm 不再被判违规（指令反报 Unused）；
      // 语义上这是 hydrate 后一次性表单初始化，非 render 中随渲染写 state，本就合规。
      // 若未来重构移除 catch-setState 模式后规则报此处违规，再按当时报错补指令。
      setForm({
        riderName: rider.riderName ?? rider.name ?? '',
        phone: rider.phone.replace('+670 ', ''),
        vehicleType: rider.vehicleType ?? '',
        vehiclePlate: rider.vehiclePlate ?? '',
        // idCardNumber 仅从兼容字段 licenseNumber 读，RiderProfile 无此字段
        idCardNumber: rider.licenseNumber ?? '',
      });
    }
  }, [rider]);

  // upload 模块批A：假上传 → 真上传（与 register.tsx handleUpload 同构；
  // URL 存 state，保存时随 PATCH /rider/profile 提交落库）。
  // 批B（U4）：失败回 'error' 态（UploadTile 红框 + hint，再点即重选上传）；
  // 批B（A4）：选图后先走 document 场景预校验（≥300×200，与后端同码），有尺寸元数据才校验
  const handleUpload = async (key: UploadKey) => {
    if (uploads[key] === 'uploading') return;
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
      // 失败回 error 态（UploadTile 红框 + hint，再点重试）；ApiError 透传后端已本地化文案
      setUploads((prev) => ({ ...prev, [key]: 'error' }));
      setUploadHints((prev) => ({
        ...prev,
        [key]: err instanceof Error && err.message ? err.message : t('profile.uploadFailed'),
      }));
      const msg = err instanceof Error && err.message ? err.message : t('profile.uploadFailed');
      showToast(msg, 'error');
    }
  };

  // P2 §3.4：手写校验（仅 mock 模式提交前调用，real 只读无提交）
  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.riderName.trim()) e.riderName = t('profile.error.nameRequired');
    if (!form.phone) e.phone = t('profile.error.phoneRequired');
    else if (!isValidPhone(form.phone)) e.phone = t('profile.error.phoneInvalid');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // 输入时清对应字段 error，避免红字残留到下次提交（同 A2 register 审查 P2-1）
  const clearFieldError = (field: keyof EditForm) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const setField = <K extends keyof EditForm>(field: K, value: EditForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  // P2 §3.5：saveProfile（仅 mock 模式）
  // 字段错位修复（§2④）：vehiclePlate 提交到 vehiclePlate（不再塞 licenseNumber），
  // vehicleType 纳入 payload（不再丢弃），idCardNumber 因 RiderProfile 无此字段不可提交（仅展示）。
  const saveProfile = async () => {
    if (!validate()) return;
    try {
      await updateProfile.mutateAsync({
        riderName: form.riderName.trim(),
        phone: form.phone.startsWith('+670') ? form.phone : `+670 ${form.phone}`,
        vehicleType: form.vehicleType || undefined,
        vehiclePlate: form.vehiclePlate || null,
        // upload 模块批A：已上传的证件 URL 随 PATCH 落库（仅用户本页传过才带，undefined 不触发更新）
        ...(uploadUrls.licenseImageUrl !== undefined
          ? { licenseImageUrl: uploadUrls.licenseImageUrl }
          : {}),
        ...(uploadUrls.idCardImageUrl !== undefined
          ? { idCardImageUrl: uploadUrls.idCardImageUrl }
          : {}),
      });
      showToast(t('profile.savedToast'), 'success');
      router.replace('/(main)/profile');
    } catch (e) {
      // B1 最小配套：保存失败留在本页保留输入可重试（real 只读降级后不会走到此分支）
      console.error('[profile/edit] saveProfile failed:', e);
      showToast(
        e instanceof ApiError ? t('profile.saveFailed') : t('common.networkError'),
        'error',
      );
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* P2 §2②：标题修正——auth.register.title→profile.editTitle（不再误用注册「成为骑手伙伴」） */}
      <SimplePageHeader
        backLabel={t('common.back')}
        fallbackHref="/(main)/profile"
        title={t('profile.editTitle')}
      />
      <ScrollView contentContainerClassName="items-center px-5 py-8 pb-10">
        <View
          className={`w-full max-w-lg gap-12 ${editable ? '' : 'opacity-60'}`}
          pointerEvents={editable ? 'auto' : 'none'}
        >
          {/* P2 §2①：real 只读态顶部说明条 + 客服入口（跳 /help，P5 修电话可拨打） */}
          {!editable ? (
            <View className="flex-row items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low px-5 py-4">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-bold text-on-surface">
                  {t('profile.editReadonlyHint')}
                </Text>
                <Text className="mt-1 text-xs text-on-surface-variant">
                  {t('profile.editReadonlyContact')}
                </Text>
              </View>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t('profile.editReadonlyContact')}
                className="items-center justify-center rounded-lg bg-primary px-4 py-2"
                onPress={() => router.push('/help')}
              >
                <Text className="text-xs font-bold text-white">{t('profile.helpCenter')}</Text>
              </Pressable>
            </View>
          ) : null}

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
                value={form.riderName}
                onChangeText={(v) => setField('riderName', v)}
                error={errors.riderName}
                editable={editable}
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
                className="px-2"
                value={form.phone}
                onChangeText={(v) => setField('phone', v)}
                error={errors.phone}
                editable={editable}
              />
              {/* P2 §2⑤：vehicleType 三选一 SegmentedControl（套用 register.tsx:209-229 范式） */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {t('auth.register.vehicleType')}
                </Text>
                <View className="flex-row gap-2">
                  {vehicleOptions.map((opt) => {
                    const active = form.vehicleType === opt.value;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t(opt.labelKey)}
                        accessibilityState={{ selected: active }}
                        key={opt.value}
                        className={`flex-1 items-center justify-center rounded-lg border px-2 py-3 ${active ? 'border-primary bg-primary' : 'border-outline-variant bg-surface'}`}
                        onPress={() => setField('vehicleType', opt.value)}
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
              {/* P2-1 §6⑤A 路线 A：idCardNumber 只读展示（mock/real 均不可编辑）。
                  RiderProfile 无此字段，提交时被 Partial<RiderProfile> 丢弃；只读是唯一不自相矛盾的实现。
                  helperText 标注「证件号注册后不可自行修改」管理用户预期，避免「保存成功但未生效」困惑。 */}
              <Input
                label={t('auth.register.identityCard')}
                placeholder={t('auth.register.identityCardPlaceholder')}
                helperText={t('profile.idCardReadonlyHint')}
                value={form.idCardNumber}
                editable={false}
              />
              <Input
                label={t('profile.vehiclePlate')}
                placeholder={t('profile.vehiclePlate')}
                value={form.vehiclePlate}
                onChangeText={(v) => setField('vehiclePlate', v)}
                editable={editable}
              />
            </View>
          </View>

          <View className="gap-6">
            <View className="flex-row items-center gap-3 border-b border-outline-variant pb-2">
              <AppIcon name="document" className="text-xl text-primary" />
              <Text className="text-xl font-semibold text-on-surface">
                {t('auth.register.documents')}
              </Text>
            </View>
            {/* upload 模块批A：假上传改真上传（选图→上传→URL 随 PATCH 落库）。
                mock/real 均可传；上传中 disabled 防重入；selected=上传成功。
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

          {/* P2 §2①：real 只读降级隐藏保存按钮（mock 模式才渲染） */}
          {editable ? (
            <View>
              <Button
                className="h-16 rounded-2xl"
                disabled={updateProfile.isPending}
                loading={updateProfile.isPending}
                textClassName="text-lg"
                onPress={() => void saveProfile()}
              >
                {t('auth.register.saveProfile')}
              </Button>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
