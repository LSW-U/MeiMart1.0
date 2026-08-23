import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { SimplePageHeader } from '../../src/components/layout/SimplePageHeader';
import { showToast } from '../../src/components/feedback/Toast';
import { AppIcon, Button, Input, UploadTile } from '../../src/components/ui';
import { useTranslation } from '../../src/i18n/useTranslation';
import type { TranslationKey } from '../../src/i18n/useTranslation';
import { ApiError, isMockMode } from '../../src/services/api';
import { isValidPhone } from '../../src/services/auth';
import { useUpdateProfile } from '../../src/services/queries/useRider';
import { useAuthStore } from '../../src/store/useAuthStore';
import type { VehicleType } from '../../src/types/rider';

type UploadKey = 'license' | 'biFront' | 'biBack' | 'vehicle';

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
  // isMockMode 首次引入 UI 层（service 层已用，判据一致：无 API_BASE_URL=可演示编辑）。
  const editable = isMockMode;

  const [form, setForm] = useState<EditForm>({
    riderName: '',
    phone: '',
    vehicleType: '',
    vehiclePlate: '',
    idCardNumber: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploads, setUploads] = useState<Record<UploadKey, boolean>>({
    license: false,
    biFront: false,
    biBack: false,
    vehicle: false,
  });

  const rider = useAuthStore((s) => s.rider);
  const updateProfile = useUpdateProfile();

  // P2 §3.3：rider hydrate 后批量初始化表单（B 阶段 RHF + key reset 后整体移除）
  useEffect(() => {
    if (rider) {
      /* eslint-disable react-hooks/set-state-in-effect -- 原因：rider hydrate 后批量初始化表单字段；B 阶段接入 react-hook-form + key reset 后整体移除 */
      setForm({
        riderName: rider.riderName ?? rider.name ?? '',
        phone: rider.phone.replace('+670 ', ''),
        vehicleType: rider.vehicleType ?? '',
        vehiclePlate: rider.vehiclePlate ?? '',
        // idCardNumber 仅从兼容字段 licenseNumber 读，RiderProfile 无此字段
        idCardNumber: rider.licenseNumber ?? '',
      });
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [rider]);

  const toggleUpload = (key: UploadKey) => {
    setUploads((current) => ({ ...current, [key]: !current[key] }));
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
      });
      showToast(t('profile.savedToast'), 'success');
      router.replace('/(main)/profile');
    } catch (e) {
      // B1 最小配套：保存失败留在本页保留输入可重试（real 只读降级后不会走到此分支）
      console.error('[profile/edit] saveProfile failed:', e);
      showToast(e instanceof ApiError ? t('profile.saveFailed') : t('common.networkError'), 'error');
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* P2 §2②：标题修正——auth.register.title→profile.editTitle（不再误用注册「成为骑手伙伴」） */}
      <SimplePageHeader backLabel={t('common.back')} fallbackHref="/(main)/profile" title={t('profile.editTitle')} />
      <ScrollView contentContainerClassName="items-center px-5 py-8 pb-10">
        <View className={`w-full max-w-lg gap-12 ${editable ? '' : 'opacity-60'}`} pointerEvents={editable ? 'auto' : 'none'}>
          {/* P2 §2①：real 只读态顶部说明条 + 客服入口（跳 /help，P5 修电话可拨打） */}
          {!editable ? (
            <View className="flex-row items-center justify-between rounded-xl border border-outline-variant bg-surface-container-low px-5 py-4">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-bold text-on-surface">{t('profile.editReadonlyHint')}</Text>
                <Text className="mt-1 text-xs text-on-surface-variant">{t('profile.editReadonlyContact')}</Text>
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
              <Text className="text-xl font-semibold text-on-surface">{t('auth.register.personalDetails')}</Text>
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
                leftSlot={<Text className="self-stretch border-r border-outline-variant bg-surface-container-low px-4 py-3 text-base text-on-surface-variant">+670</Text>}
                placeholder={t('auth.register.phonePlaceholder')}
                className="px-2"
                value={form.phone}
                onChangeText={(v) => setField('phone', v)}
                error={errors.phone}
                editable={editable}
              />
              {/* P2 §2⑤：vehicleType 三选一 SegmentedControl（套用 register.tsx:209-229 范式） */}
              <View className="gap-1.5">
                <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('auth.register.vehicleType')}</Text>
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
                        <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-on-surface-variant'}`}>{t(opt.labelKey)}</Text>
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
              <Text className="text-xl font-semibold text-on-surface">{t('auth.register.documents')}</Text>
            </View>
            {/* TODO(P2 §5/§6⑦)：假上传——后端无 /rider/documents/upload 端点（W6+），4 个 UploadTile 仅切 boolean；
                real 只读模式整组灰显。真实上传归后端 W6+ 支持后另立任务。 */}
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

          {/* P2 §2①：real 只读降级隐藏保存按钮（mock 模式才渲染） */}
          {editable ? (
            <View>
              <Button className="h-16 rounded-2xl" disabled={updateProfile.isPending} loading={updateProfile.isPending} textClassName="text-lg" onPress={() => void saveProfile()}>
                {t('auth.register.saveProfile')}
              </Button>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
