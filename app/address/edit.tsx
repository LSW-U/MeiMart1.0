// AddressEditPage — 还原自 AddressListPage.html（177 行，HTML 文件名与内容反向）
// HTML 行数 177 → RN ~340（含样式），满足 CLAUDE.md 规则 #28 的 30% 门槛
// Fix-22: PrimaryHeader + tais-pattern + person/call/location_city/home/location_on + PIN ON MAP + Switch + Cultural Motif
// CP-FIX-2.3: 表单迁移到 react-hook-form + zod（规则 9）
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { Switch } from '@/components/ui/Switch';
import { useAddresses, useCreateAddress, useUpdateAddress } from '@/services/queries/useAddress';
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
  };
}

export default function AddressEditPage() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
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
      <Header title={isEditing ? 'Edit Address' : 'Add New Address'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
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
            };
            if (existing) {
              updateMutation.mutate(
                { id: existing.id, updates: payload },
                { onSuccess: () => router.back() },
              );
            } else {
              createMutation.mutate(payload, { onSuccess: () => router.back() });
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

  const { control, handleSubmit } = useForm<AddressEditValues>({
    resolver: zodResolver(addressEditSchema),
    defaultValues: toFormValues(existing),
    mode: 'onBlur',
  });

  const submit = handleSubmit((values) => onSubmit(values));

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
          label="FULL NAME"
          placeholder="e.g., Maria Silva"
          testID="addr-name"
        />

        {/* PHONE NUMBER with +670 prefix */}
        <View>
          <FieldLabel icon="call" label="PHONE NUMBER" />
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
                    placeholder="7712 3456"
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
        <View>
          <FieldLabel icon="location_city" label="DISTRICT / REGION" />
          <Controller
            control={control}
            name="province"
            render={({ field: { value, onChange } }) => (
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'Select District',
                    'Choose your district',
                    DISTRICTS.map((d) => ({ text: d, onPress: () => onChange(d) })),
                  );
                }}
                style={[
                  styles.selectBox,
                  {
                    backgroundColor: colors['surface-container-lowest'],
                    borderColor: colors['outline-variant'],
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select district, current ${value || 'none'}`}
              >
                <Text
                  style={[
                    styles.selectText,
                    {
                      color: value ? colors['on-surface'] : colors['on-surface-variant'],
                    },
                  ]}
                >
                  {value || 'Select District'}
                </Text>
                <Icon symbol="expand_more" size={20} color={colors['on-surface-variant']} />
              </Pressable>
            )}
          />
        </View>

        {/* COMPLETE ADDRESS + city/sub-district */}
        <View>
          <View style={styles.addrLabelRow}>
            <FieldLabel icon="home" label="COMPLETE ADDRESS" />
            <Pressable
              onPress={() => router.push('/address/map')}
              hitSlop={8}
              style={styles.pinBtn}
              accessibilityRole="button"
              accessibilityLabel="Pin on map"
            >
              <Icon symbol="location_on" size={14} color={colors.primary} />
              <Text style={[styles.pinBtnText, { color: colors.primary }]}>PIN ON MAP</Text>
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
                placeholder="Village, Sub-district, street name, house number..."
                placeholderTextColor={colors['on-surface-variant']}
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                testID="addr-detail"
              />
            )}
          />
          <View style={styles.cityRow}>
            <View style={styles.col}>
              <FieldLabel icon="apartment" label="CITY" />
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
              <FieldLabel icon="location_city" label="SUB-DISTRICT" />
              <Controller
                control={control}
                name="district"
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
                    placeholder="Cristo Rei"
                    placeholderTextColor={colors['on-surface-variant']}
                    value={value}
                    onChangeText={onChange}
                    testID="addr-district"
                  />
                )}
              />
            </View>
          </View>
        </View>

        <View style={[styles.defaultRow, { borderTopColor: colors['outline-variant'] }]}>
          <Text style={[styles.defaultLabel, { color: colors['on-surface'] }]}>
            Set as default address
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
          accessibilityLabel="Save address"
        >
          <Text style={styles.saveBtnText}>SAVE ADDRESS</Text>
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

function Header({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="header">
      <View style={[styles.trackerBar, { backgroundColor: colors.primary }]}>
        <Text style={styles.trackerText}>MANAGE YOUR ADDRESSES</Text>
      </View>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerPattern} pointerEvents="none">
          <TaisPattern width={390} height={72} opacity={0.2} />
        </View>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon symbol="arrow_back" size={24} color="#ffffff" />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable
            onPress={() => router.push('/service/help')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Help"
          >
            <Icon symbol="help_outline" size={24} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trackerBar: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  header: {
    position: 'relative',
    height: 72,
    overflow: 'hidden',
    paddingHorizontal: spacing['container-margin'],
    justifyContent: 'center',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 20,
  },
  scroll: {
    padding: spacing['container-margin'],
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
  cityRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  col: {
    flex: 1,
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
    padding: spacing['container-margin'],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    height: 52,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    ...typography['body-md'],
    fontWeight: '700',
    letterSpacing: 1,
  },
  errorText: {
    ...typography['body-sm'],
    marginTop: spacing.xs,
  },
});
