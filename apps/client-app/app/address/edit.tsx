// AddressEditPage — 还原自 AddressListPage.html（177 行，HTML 文件名与内容反向）
// HTML 行数 177 → RN ~340（含样式），满足 CLAUDE.md 规则 #28 的 30% 门槛
// Fix-22: PrimaryHeader + tais-pattern + person/call/location_city/home/location_on + PIN ON MAP + Switch + Cultural Motif
// CP-FIX-2.3: 表单迁移到 react-hook-form + zod（规则 9）
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { Controller, useForm } from 'react-hook-form';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader/PrimaryHeader';
import { Icon } from '@/components/ui/Icon';
import { Switch } from '@/components/ui/Switch';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField/SelectField';
import { toast } from '@/store/toastStore';
import { useAddresses, useCreateAddress, useUpdateAddress } from '@/services/queries/useAddress';
import { isDiliDefaultCoords } from '@/services/address';
import { textGeocode, type GeoHit } from '@/services/geocode';
import { useMapPickStore } from '@/store/mapPickStore';
import { addressEditSchema, type AddressEditValues } from '@/forms/schemas/user';
import type { Address } from '@/types';

const DISTRICTS = ['Dili', 'Baucau', 'Ermera', 'Liquiçá', 'Aileu', 'Manatuto', 'Bobonaro'];

function toFormValues(existing?: Address): AddressEditValues {
  return {
    recipientName: existing?.name ?? '',
    phone: existing?.phone ?? '',
    province: existing?.province ?? '',
    city: existing?.city ?? '',
    district: existing?.district ?? 'Dili',
    detail: existing?.detail ?? '',
    isDefault: existing?.isDefault ?? false,
    tag: existing?.tag ?? undefined,
  };
}

export default function AddressEditPage() {
  const handleBack = useSafeBack();
  // Why: 审查 B2 —— 离开编辑页（含保存成功 back）时清地图选点，防止残留 pick 污染
  //      下一次无关地址编辑的坐标/detail（幽灵地址回填）。从 map 回来是栈内返回，本页不卸载不受影响。
  useEffect(() => {
    return () => {
      useMapPickStore.getState().clear();
    };
  }, []);
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { id, prefillName, prefillPhone, prefillDetail } = useLocalSearchParams<{
    id?: string;
    // Why: P16 决策 9 —— 智能识别解析结果跳转带入（expo-router params 均为 string）
    prefillName?: string;
    prefillPhone?: string;
    prefillDetail?: string;
  }>();
  // Why: 提交时用地图选点坐标（B3）；表单内的状态行在 AddressForm 里另行订阅
  const mapPick = useMapPickStore((s) => s.pick);
  // N-P1-3：isLoading 区分「查询中」与「编辑态数据查不到」——深链/无效 id 不得静默落 create
  const { data: addresses, isLoading } = useAddresses();
  const existing = addresses?.find((a) => a.id === id);
  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();
  // N-P1-3：判据从 !!existing 改 id != null——existing 未到/查不到时编辑态身份不变，
  // 保存走 update 而非 create（防无效 id 静默建新地址）
  const isEditing = id != null;

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      {/* N-P1-3：编辑态标题在数据到达前即按 id 判定（isEditing 与 existing 解耦） */}
      <PrimaryHeader
        title={
          isEditing
            ? t('address.edit', { defaultValue: 'Edit Address' })
            : t('address.add', { defaultValue: 'Add New Address' })
        }
        showBack
        onBackPress={handleBack}
        rightActions={
          <Pressable
            onPress={() => router.push('/service/help')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.help')}
          >
            <Icon symbol="help_outline" size={24} color={colors['on-primary']} />
          </Pressable>
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // Why: position relative 让 bottomBar absolute 相对此容器定位，避免 Web 端定位错误
        style={{ flex: 1, position: 'relative' }}
      >
        {/* N-P1-3①：列表查询中渲染骨架不渲染表单（避免拿旧 prefill 闪现） */}
        {isLoading ? (
          <View style={styles.skeletonWrap} testID="addr-edit-loading">
            {[0, 1, 2].map((row) => (
              <View
                key={row}
                style={[styles.skeletonBar, { backgroundColor: colors['surface-container-high'] }]}
              />
            ))}
          </View>
        ) : isEditing && !existing ? (
          /* N-P1-3③：编辑态 id 有值但数据查不到 → 页内错误态（D2），绝不静默回退 create */
          <View style={styles.errorWrap} testID="addr-edit-notfound">
            <Icon symbol="error_outline" size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors['on-surface-variant'] }]}>
              {t('errors.addresses', { defaultValue: 'Failed to load addresses' })}
            </Text>
            <Pressable
              onPress={handleBack}
              style={[styles.backToListBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              testID="addr-edit-back"
            >
              <Text style={[styles.backToListText, { color: colors['on-primary'] }]}>
                {t('common.back')}
              </Text>
            </Pressable>
          </View>
        ) : (
          /* N-P1-3：表单 prefill 仅在「非编辑态」传入；编辑态 existing 未到时由 isLoading/notfound 分支挡住 */
          <AddressForm
            existing={existing}
            prefill={
              !isEditing
                ? {
                    name: prefillName ?? '',
                    phone: prefillPhone ?? '',
                    detail: prefillDetail ?? '',
                  }
                : undefined
            }
            submitting={createMutation.isPending || updateMutation.isPending}
            onSubmit={(values) => {
              const lat = mapPick?.lat ?? existing?.lat;
              const lng = mapPick?.lng ?? existing?.lng;
              // C-P2-15: 未选地图点（无选点记录 + 无旧坐标，或坐标仍为帝力默认视野）禁止提交——
              // 后端下单要求真实 lat/lng 匹配仓库，静默填帝力默认会让用户收不到货。提示去地图选点。
              if (isDiliDefaultCoords(lat, lng)) {
                toast.error(t('address.pickLocationRequired'));
                return;
              }
              const payload: Omit<Address, 'id'> = {
                name: values.recipientName,
                phone: values.phone,
                province: values.province,
                city: values.city,
                district: values.district,
                detail: values.detail,
                isDefault: values.isDefault,
                // Why: 审查 B1 —— tag 必须显式进 payload（toAddressPayload 对 undefined 不传，后端存 null）；
                //      ?? null 让「清除标签」也能通过 PATCH 落库
                tag: values.tag ?? null,
                // Why: 地图选点坐标优先（B3 修复）；此处守卫已保证非空非默认
                lat,
                lng,
              };
              const onError = (error: unknown) => {
                // Why: 提取后端错误码，用 i18n 翻译，找不到时回退到 generic
                const err = error as {
                  response?: { data?: { error?: { code?: string; message?: string } } };
                  message?: string;
                };
                const code = err?.response?.data?.error?.code;
                const fallback = err?.response?.data?.error?.message ?? err?.message;
                const translated = code
                  ? t(`errors.${code}`, { defaultValue: fallback })
                  : fallback;
                toast.error(translated ?? t('errors.generic'));
              };
              if (existing) {
                // N-P1-3：编辑态保存走 update；existing 查不到的分支已被上方错误态拦截，
                // 此分支仅在 existing 有值时可达，绝不静默落 create
                updateMutation.mutate(
                  { id: existing.id, updates: payload },
                  {
                    onSuccess: () => {
                      toast.success(t('address.saved', { defaultValue: 'Address saved' }));
                      handleBack();
                    },
                    onError,
                  },
                );
              } else {
                // N-P1-3：仅新增态（id 无值）可达——编辑态查不到时被 notfound 分支拦截，不走这里
                createMutation.mutate(payload, {
                  onSuccess: () => {
                    toast.success(t('address.saved', { defaultValue: 'Address saved' }));
                    handleBack();
                  },
                  onError,
                });
              }
            }}
          />
        )}
      </KeyboardAvoidingView>{' '}
    </SafeAreaWrapper>
  );
}

interface AddressFormProps {
  existing?: Address;
  /** P16 决策 9 —— 智能识别预填（仅新增地址时生效） */
  prefill?: { name: string; phone: string; detail: string };
  submitting: boolean;
  onSubmit: (values: AddressEditValues) => void;
}

function AddressForm({ existing, prefill, submitting, onSubmit }: AddressFormProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // Why: P16 决策 4/10 —— map 页选址回传（B3 断裂修复）：pick 有值 = 已通过地图定位
  const mapPick = useMapPickStore((s) => s.pick);

  const { control, handleSubmit, setValue } = useForm<AddressEditValues>({
    resolver: zodResolver(addressEditSchema),
    // Why: 编辑用已有值；新增时智能识别 prefill 优先于空串
    defaultValues: existing
      ? toFormValues(existing)
      : {
          ...toFormValues(undefined),
          ...(prefill?.name ? { recipientName: prefill.name } : {}),
          ...(prefill?.phone ? { phone: prefill.phone } : {}),
          ...(prefill?.detail ? { detail: prefill.detail } : {}),
        },
    mode: 'onBlur',
  });

  // Why: 地图选点回来（pickedAt 变化）自动回填 detail（用户主动去地图选点，期望带回地址；
  //      回来后仍可手动改）。同一 pick 对象不重复触发。
  const lastAppliedPick = useRef(0);
  useEffect(() => {
    if (mapPick && mapPick.pickedAt !== lastAppliedPick.current) {
      lastAppliedPick.current = mapPick.pickedAt;
      if (mapPick.address) {
        setValue('detail', mapPick.address);
      }
    }
  }, [mapPick, setValue]);

  // 批1 T5（D1/D9）：文本框防抖文本转坐标——detail 输入 ≥2 字符后 1.2s 防抖调 textGeocode
  //（后端 geo 限流 1 req/s + 10 req/min，防抖 <1s 必撞 429）；结果展示为 suggest 下拉，
  // 点击才回填坐标（setPick）。source==='fallback' / formattedAddress==null → 不回填，
  // toast 引导改用地图选点（fallback 坐标即帝力默认点，回填会伪造「已定位」骗过 C-P2-15 守卫）。
  const [geoHits, setGeoHits] = useState<GeoHit[]>([]);
  const [geoResolving, setGeoResolving] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);
  const resolveDetailText = (text: string) => {
    const trimmed = text.trim();
    setGeoHits([]);
    if (trimmed.length < 2) return;
    setGeoResolving(true);
    textGeocode(trimmed)
      .then((result) => {
        if (result.source === 'fallback' || result.formattedAddress == null) {
          // D9：fallback（后端失败/无结果返 Dili 中心兜底）不回填——当次输入未定位，保持无坐标态
          setGeoHits([]);
          toast.info(
            t('address.suggestNotFound', { defaultValue: 'Could not locate this address' }),
          );
        } else {
          // 真实命中：作为单条可点结果展示（formattedAddress 作 label），点击回填坐标
          setGeoHits([{ lat: result.lat, lng: result.lng, label: result.formattedAddress }]);
        }
      })
      .catch(() => {
        // E-COMMON-004 超频等：静默降级为「未定位」，不打断输入
        setGeoHits([]);
      })
      .finally(() => setGeoResolving(false));
  };
  const handleDetailChange = (text: string, onChange: (v: string) => void) => {
    onChange(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => resolveDetailText(text), 1200);
  };
  const applyGeoHit = (hit: GeoHit) => {
    // Why: 回填走 mapPickStore.setPick——与地图选点同一数据通道，locatedRow/C-P2-15 守卫
    //      消费同一 pick（pickedAt 变化触发 detail 回填 + 提交坐标放行）
    useMapPickStore.getState().setPick({ lat: hit.lat, lng: hit.lng, address: hit.label });
    setGeoHits([]);
    toast.success(t('address.suggestSelect', { defaultValue: 'Location set' }));
  };

  // Why: 校验失败时 toast 提示第一个错误，避免用户点击无反应
  const submit = handleSubmit(
    (values) => onSubmit(values),
    (errors) => {
      const firstError = Object.values(errors)[0];
      const message = firstError?.message;
      if (message) {
        toast.error(typeof message === 'string' ? message : t('errors.generic'));
      }
    },
  );

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Field
          control={control}
          name="recipientName"
          icon="person"
          label={t('address.name', { defaultValue: 'FULL NAME' })}
          placeholder={t('address.namePlaceholder', { defaultValue: 'e.g., Maria Silva' })}
          testID="addr-name"
        />

        {/* PHONE NUMBER with +670 prefix */}
        <View>
          <FieldLabel icon="call" label={t('address.phone', { defaultValue: 'PHONE NUMBER' })} />
          <View style={styles.phoneRow}>
            <View
              style={[
                styles.phonePrefix,
                {
                  backgroundColor: colors['surface-container-low'],
                  borderColor: colors['outline-variant'],
                },
              ]}
            >
              <Text style={[styles.phonePrefixText, { color: colors['on-surface'] }]}>+670</Text>
            </View>
            <View style={styles.phoneInput}>
              <Controller
                control={control}
                name="phone"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors['surface-container-lowest'],
                        borderColor: colors['outline-variant'],
                        color: colors['on-surface'],
                      },
                    ]}
                    placeholder={t('address.phonePlaceholder', { defaultValue: '7712 3456' })}
                    placeholderTextColor={colors['on-surface-variant']}
                    keyboardType="phone-pad"
                    value={value}
                    onChangeText={onChange}
                    testID="addr-phone"
                  />
                )}
              />
            </View>
          </View>
        </View>

        {/* DISTRICT / REGION select */}
        <SelectField
          control={control}
          name="province"
          label={t('address.province', { defaultValue: 'DISTRICT / REGION' })}
          icon="location_city"
          placeholder={t('address.provincePlaceholder', { defaultValue: 'Select District' })}
          options={DISTRICTS}
          testID="addr-province"
        />

        {/* COMPLETE ADDRESS + city/sub-district */}
        <View>
          <View style={styles.addrLabelRow}>
            <FieldLabel
              icon="home"
              label={t('address.detail', { defaultValue: 'COMPLETE ADDRESS' })}
            />
            <Pressable
              onPress={() => router.push('/address/map')}
              hitSlop={8}
              style={styles.pinBtn}
              accessibilityRole="button"
              accessibilityLabel={t('address.a11y.pinOnMap')}
            >
              <Icon symbol="location_on" size={14} color={colors.primary} />
              <Text style={[styles.pinBtnText, { color: colors.primary }]}>
                {t('address.pickOnMap', { defaultValue: 'PIN ON MAP' })}
              </Text>
            </Pressable>
          </View>
          <Controller
            control={control}
            name="detail"
            render={({ field: { value, onChange } }) => (
              <>
                <TextInput
                  style={[
                    styles.textarea,
                    {
                      backgroundColor: colors['surface-container-lowest'],
                      borderColor: colors['outline-variant'],
                      color: colors['on-surface'],
                    },
                  ]}
                  placeholder={t('address.detailPlaceholder', {
                    defaultValue: 'Village, Sub-district, street name, house number...',
                  })}
                  placeholderTextColor={colors['on-surface-variant']}
                  value={value}
                  onChangeText={(text) => handleDetailChange(text, onChange)}
                  multiline
                  numberOfLines={3}
                  testID="addr-detail"
                />
                {/* 批1 T5：文本转坐标下拉（geocode 命中时展示，点击回填坐标） */}
                {geoResolving && (
                  <Text
                    style={[styles.geoHintText, { color: colors['on-surface-variant'] }]}
                    testID="addr-geo-resolving"
                  >
                    {t('address.suggestLocating', {
                      defaultValue: 'Resolving address location...',
                    })}
                  </Text>
                )}
                {geoHits.map((hit) => (
                  <Pressable
                    key={`${hit.lat},${hit.lng}`}
                    testID="addr-geo-hit"
                    onPress={() => applyGeoHit(hit)}
                    style={[
                      styles.geoHitRow,
                      {
                        backgroundColor: colors['surface-container-lowest'],
                        borderColor: colors['outline-variant'],
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={hit.label}
                  >
                    <Icon symbol="location_on" size={16} color={colors.primary} />
                    <Text
                      style={[styles.geoHitText, { color: colors['on-surface'] }]}
                      numberOfLines={2}
                    >
                      {hit.label}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}
          />
          {/* P16 决策 10 —— 地图选点回传后的定位状态反馈（未定位不显示） */}
          {mapPick && (
            <View style={styles.locatedRow} testID="addr-located">
              <Icon symbol="check_circle" size={14} color={colors.primary} />
              <Text style={[styles.locatedText, { color: colors.primary }]}>
                {t('address.located', { defaultValue: 'Pinned via map' })}
              </Text>
              <Text style={[styles.locatedCoords, { color: colors['on-surface-variant'] }]}>
                {mapPick.lat.toFixed(4)}°, {mapPick.lng.toFixed(4)}°
              </Text>
            </View>
          )}
          <View style={styles.cityRow}>
            <View style={styles.col}>
              <FieldLabel icon="apartment" label={t('address.city', { defaultValue: 'CITY' })} />
              <Controller
                control={control}
                name="city"
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors['surface-container-lowest'],
                        borderColor: colors['outline-variant'],
                        color: colors['on-surface'],
                      },
                    ]}
                    placeholder={t('address.cityPlaceholder', { defaultValue: 'Dili' })}
                    placeholderTextColor={colors['on-surface-variant']}
                    value={value}
                    onChangeText={onChange}
                    testID="addr-city"
                  />
                )}
              />
            </View>
            <View style={styles.col}>
              {/* P16 决策 5：district 从 TextInput 手输改 SelectField 下拉（与 province 交互一致），选项用 DISTRICTS 常量 */}
              <SelectField
                control={control}
                name="district"
                icon="location_city"
                label={t('address.district', { defaultValue: 'SUB-DISTRICT' })}
                placeholder={t('address.districtPlaceholder', { defaultValue: 'Cristo Rei' })}
                options={DISTRICTS}
                testID="addr-district"
              />
            </View>
          </View>
        </View>

        {/* P16 决策 7 —— 地址标签选择器：家/公司/学校 3 预置 chip + 自定义输入 */}
        <View>
          <FieldLabel icon="label" label={t('address.tagLabel', { defaultValue: 'TAG' })} />
          <Controller
            control={control}
            name="tag"
            render={({ field: { value, onChange } }) => (
              <TagPicker value={value} onChange={onChange} />
            )}
          />
        </View>

        <View style={[styles.defaultRow, { borderTopColor: colors['outline-variant'] }]}>
          <Text style={[styles.defaultLabel, { color: colors['on-surface'] }]}>
            {t('address.setDefault', { defaultValue: 'Set as default address' })}
          </Text>
          <Controller
            control={control}
            name="isDefault"
            render={({ field: { value, onChange } }) => (
              <Switch value={value} onValueChange={onChange} testID="addr-default" />
            )}
          />
        </View>

        {/* Cultural Motif Separator */}
        <View style={styles.motifRow}>
          <View style={[styles.motifLine, { backgroundColor: colors['outline-variant'] }]} />
          <MotifTriangle size={16} color={colors.primary} opacity={1} />
          <MotifTriangle size={24} color={colors.primary} opacity={0.6} />
          <MotifTriangle size={16} color={colors.primary} opacity={1} />
          <View style={[styles.motifLine, { backgroundColor: colors['outline-variant'] }]} />
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderTopColor: colors['outline-variant'],
          },
        ]}
      >
        <Pressable
          onPress={submit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
            submitting && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('address.a11y.save')}
        >
          <Text style={[styles.saveBtnText, { color: colors['on-primary'] }]}>
            {t('address.save', { defaultValue: 'SAVE ADDRESS' })}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

interface FieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  icon: string;
  label: string;
  placeholder?: string;
  testID?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}

function Field<T extends FieldValues>({
  control,
  name,
  icon,
  label,
  placeholder,
  testID,
}: FieldProps<T>) {
  const { colors } = useTheme();
  return (
    <View>
      <FieldLabel icon={icon} label={label} />
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
          <>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors['surface-container-lowest'],
                  borderColor: error ? colors.error : colors['outline-variant'],
                  color: colors['on-surface'],
                },
              ]}
              placeholder={placeholder}
              placeholderTextColor={colors['on-surface-variant']}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              testID={testID}
            />
            {error?.message && (
              <Text
                style={[styles.fieldErrorText, { color: colors.error }]}
                accessibilityRole="alert"
              >
                {error.message}
              </Text>
            )}
          </>
        )}
      />
    </View>
  );
}

function FieldLabel({ icon, label }: { icon: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.labelRow}>
      <Icon symbol={icon} size={16} color={colors['on-surface-variant']} />
      <Text style={[styles.labelText, { color: colors['on-surface-variant'] }]}>{label}</Text>
    </View>
  );
}

// P16 决策 7：预置 chip（选中态描边高亮）+ 自定义 chip（点击弹输入）。value 为空 = 不设标签
const PRESET_TAGS = ['home', 'company', 'school'] as const;

function TagPicker({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [customVisible, setCustomVisible] = useState(false);
  const [customText, setCustomText] = useState('');
  const isCustom = !!value && !PRESET_TAGS.includes(value as (typeof PRESET_TAGS)[number]);
  const label = (tag: string) =>
    tag === 'custom'
      ? isCustom && value
        ? value
        : t('address.tagCustom', { defaultValue: 'Custom' })
      : t(`address.tag${tag[0].toUpperCase()}${tag.slice(1)}`, {
          defaultValue: tag,
        });

  const chipStyle = (selected: boolean) => [
    styles.tagChip,
    {
      backgroundColor: selected ? colors['primary-container'] : colors['surface-container-lowest'],
      borderColor: selected ? colors.primary : colors['outline-variant'],
    },
  ];

  return (
    <View style={styles.tagRow}>
      {[...PRESET_TAGS, 'custom'].map((tag) => {
        const selected = tag === 'custom' ? isCustom : value === tag;
        return (
          <Pressable
            key={tag}
            onPress={() => {
              if (tag === 'custom') {
                if (isCustom) {
                  // 再点自定义 = 清除
                  onChange(undefined);
                } else {
                  setCustomText('');
                  setCustomVisible(true);
                }
              } else {
                onChange(selected ? undefined : tag);
              }
            }}
            style={chipStyle(selected)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={label(tag)}
          >
            <Text
              style={[
                styles.tagChipText,
                { color: selected ? colors['on-primary-container'] : colors['on-surface-variant'] },
              ]}
              numberOfLines={1}
            >
              {label(tag)}
            </Text>
          </Pressable>
        );
      })}

      <Modal
        visible={customVisible}
        onClose={() => setCustomVisible(false)}
        title={t('address.tagCustomTitle', { defaultValue: 'Custom Tag' })}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
              color: colors['on-surface'],
            },
          ]}
          placeholder={t('address.tagCustomPlaceholder', { defaultValue: 'e.g., Grandma home' })}
          placeholderTextColor={colors['on-surface-variant']}
          value={customText}
          onChangeText={setCustomText}
          maxLength={20}
          autoFocus
          testID="addr-tag-custom-input"
        />
        <Button
          label={t('common.confirm', { defaultValue: 'Confirm' })}
          variant="primary"
          onPress={() => {
            const trimmed = customText.trim();
            if (trimmed) onChange(trimmed);
            setCustomVisible(false);
          }}
        />
      </Modal>
    </View>
  );
}

function MotifTriangle({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: size / 2,
        borderRightWidth: size / 2,
        borderBottomWidth: size,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
        opacity,
      }}
    />
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout['container-margin'],
    paddingBottom: 120,
    gap: spacing.lg,
  },
  // N-P1-3：查询骨架
  skeletonWrap: {
    padding: layout['container-margin'],
    gap: spacing.lg,
  },
  skeletonBar: {
    height: 56,
    borderRadius: borderRadius.xl,
  },
  // N-P1-3：编辑态数据查不到的页内错误态
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: layout['container-margin'],
  },
  errorText: {
    ...typography['body-md'],
    textAlign: 'center',
  },
  backToListBtn: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToListText: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  labelText: {
    ...typography['label-caps'],
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  phonePrefix: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonePrefixText: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  selectText: {
    ...typography['body-md'],
  },
  addrLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  pinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  pinBtnText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  locatedText: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  locatedCoords: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  // 批1 T5 文本转坐标下拉
  geoHintText: {
    ...typography['body-sm'],
    marginTop: spacing.xs,
  },
  geoHitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  geoHitText: {
    ...typography['body-sm'],
    flex: 1,
  },
  cityRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  col: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  tagChipText: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  defaultLabel: {
    ...typography['body-md'],
    fontWeight: '500',
  },
  motifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  motifLine: {
    height: 1,
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: layout['container-margin'],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    height: 52,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    ...typography['body-md'],
    fontWeight: '700',
    letterSpacing: 1,
  },
  // N-P1-3：表单字段校验错误文本（Field 组件用）
  fieldErrorText: {
    ...typography['body-sm'],
    marginTop: spacing.xs,
  },
});
