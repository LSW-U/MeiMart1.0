import { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme, spacing } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { useAddresses, useCreateAddress, useUpdateAddress } from '@/services/queries/useAddress';
import type { Address } from '@/types';

export default function AddressEditPage() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: addresses } = useAddresses();
  const existing = addresses?.find((a) => a.id === id);
  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader
        title={existing ? '编辑地址' : '新增地址'}
        showBack
        onBackPress={() => router.back()}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <AddressForm
          // key 触发 remount：当 existing 从 undefined → Address 时，state 重新初始化
          key={existing?.id ?? 'new'}
          existing={existing}
          submitting={createMutation.isPending || updateMutation.isPending}
          onSubmit={(values) => {
            if (existing) {
              updateMutation.mutate(
                { id: existing.id, updates: values },
                { onSuccess: () => router.back() },
              );
            } else {
              createMutation.mutate(values, { onSuccess: () => router.back() });
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
  onSubmit: (values: Omit<Address, 'id'>) => void;
}

function AddressForm({ existing, submitting, onSubmit }: AddressFormProps) {
  // useState 初始化器：existing 通过 key remount 时已可用，无需 useEffect+setState
  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [province, setProvince] = useState(existing?.province ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [district, setDistrict] = useState(existing?.district ?? '');
  const [detail, setDetail] = useState(existing?.detail ?? '');
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false);

  const submit = () => {
    if (!name || !phone || !province || !city || !detail) {
      Alert.alert('提示', '请填写完整信息');
      return;
    }
    onSubmit({ name, phone, province, city, district, detail, isDefault });
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Input
        label="收货人"
        placeholder="请输入姓名"
        value={name}
        onChangeText={setName}
        testID="addr-name"
      />
      <Input
        label="手机号"
        placeholder="请输入手机号"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        testID="addr-phone"
      />
      <View style={styles.row}>
        <View style={styles.col}>
          <Input
            label="省份"
            placeholder="省份"
            value={province}
            onChangeText={setProvince}
            testID="addr-province"
          />
        </View>
        <View style={styles.col}>
          <Input
            label="城市"
            placeholder="城市"
            value={city}
            onChangeText={setCity}
            testID="addr-city"
          />
        </View>
      </View>
      <Input
        label="区/县"
        placeholder="请输入区/县"
        value={district}
        onChangeText={setDistrict}
        testID="addr-district"
      />
      <Input
        label="详细地址"
        placeholder="请输入详细地址（楼栋/门牌号等）"
        value={detail}
        onChangeText={setDetail}
        testID="addr-detail"
      />
      <View style={styles.mapRow}>
        <Button
          label="在地图上选择"
          variant="text"
          onPress={() => router.push('/address/map')}
          testID="addr-pick-map"
        />
      </View>
      <View style={styles.defaultRow}>
        <Checkbox
          checked={isDefault}
          onChange={setIsDefault}
          label="设为默认地址"
          testID="addr-default"
        />
      </View>
      <Button
        label="保存"
        variant="primary"
        fullWidth
        loading={submitting}
        onPress={submit}
        testID="addr-save"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1 },
  mapRow: { alignItems: 'flex-start' },
  defaultRow: { paddingVertical: spacing.sm },
});
