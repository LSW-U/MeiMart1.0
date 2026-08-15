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
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  // Why: 提交时用地图选点坐标（B3）；表单内的状态行在 AddressForm 里另行订阅
  const mapPick = useMapPickStore((s) => s.pick);
  const { data: addresses } = useAddresses();
  const existing = addresses?.find((a) => a.id === id);
  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();
  const isEditing = !!existing;

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
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
        <AddressForm
          key={existing?.id ?? 'new'}
          existing={existing}
          submitting={createMutation.isPending || updateMutation.isPending}
          onSubmit={(values) => {
            const payload: Omit<Address, 'id'> = {
              name: values.recipientName,
              phone: values.phone,
              province: values.province,
              city: values.city,
              district: values.district,
              detail: values.detail,
              isDefault: values.isDefault,
              // Why: 地图选点坐标优先（B3 修复）；旧地址可能没有 lat/lng，兜底帝力默认坐标避免下单 409
              lat: mapPick?.lat ?? existing?.lat ?? -8.5569,
              lng: mapPick?.lng ?? existing?.lng ?? 125.5603,
            };
            const onError = (error: unknown) => {
              // Why: 提取后端错误码，用 i18n 翻译，找不到时回退到 generic
              const err = error as {
                response?: { data?: { error?: { code?: string; message?: string } } };
                message?: string;
              };
              const code = err?.response?.data?.error?.code;
              const fallback = err?.response?.data?.error?.message ?? err?.message;
              const translated = code ? t(`errors.${code}`, { defaultValue: fallback }) : fallback;
              toast.error(translated ?? t('errors.generic'));
            };
            if (existing) {
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
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}

interface AddressFormProps {
  existing?: Address;
  submitting: boolean;
  onSubmit: (values: AddressEditValues) => void;
}

function AddressForm({ existing, submitting, onSubmit }: AddressFormProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // Why: P16 决策 4/10 —— map 页选址回传（B3 断裂修复）：pick 有值 = 已通过地图定位
  const mapPick = useMapPickStore((s) => s.pick);

  const { control, handleSubmit, setValue } = useForm<AddressEditValues>({
    resolver: zodResolver(addressEditSchema),
    defaultValues: toFormValues(existing),
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
            <FieldLabel icon="home" label={t('address.detail', { defaultValue: 'COMPLETE ADDRESS' })} />
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
              <TextInput
                style={[
                  styles.textarea,
                  {
                    backgroundColor: colors['surface-container-lowest'],
                    borderColor: colors['outline-variant'],
                    color: colors['on-surface'],
                  },
                ]}
                placeholder={t('address.detailPlaceholder', { defaultValue: 'Village, Sub-district, street name, house number...' })}
                placeholderTextColor={colors['on-surface-variant']}
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                testID="addr-detail"
              />
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
                    placeholder="Dili"
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
              <Text style={[styles.errorText, { color: colors.error }]} accessibilityRole="alert">
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

      <Modal visible={customVisible} onClose={() => setCustomVisible(false)} title={t('address.tagCustomTitle', { defaultValue: 'Custom Tag' })}>
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
  errorText: {
    ...typography['body-sm'],
    marginTop: spacing.xs,
  },
});
