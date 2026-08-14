import { colors } from "../../theme/colors";
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppIcon, Button } from '../ui';

type WithdrawFormProps = {
  amountLabel: string;
  amountPlaceholder: string;
  toLabel: string;
  bankCardLabel: string;
  bankCardNumber: string;
  servicePointLabel: string;
  servicePointName: string;
  submitLabel: string;
  submitLoading?: boolean;
  note: string;
  selectedMethod: 'bank' | 'cash';
  amount: string;
  onAmountChange: (value: string) => void;
  submitDisabled?: boolean;
  onSelectMethod: (method: 'bank' | 'cash') => void;
  onSubmit: () => void;
};

export function WithdrawForm({ amountLabel, amountPlaceholder, toLabel, bankCardLabel, bankCardNumber, servicePointLabel, servicePointName, submitLabel, submitLoading = false, note, selectedMethod, amount, onAmountChange, submitDisabled, onSelectMethod, onSubmit }: WithdrawFormProps) {
  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{amountLabel}</Text>
        <TextInput
          className="rounded-lg border-2 border-outline-variant bg-surface px-8 py-2 text-lg text-on-surface"
          keyboardType="numeric"
          placeholder={amountPlaceholder}
          placeholderTextColor={colors.outline}
          value={amount}
          onChangeText={onAmountChange}
        />
      </View>
      <View className="mt-2 gap-2">
        <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{toLabel}</Text>
        <Pressable
          className={`flex-row items-center justify-between rounded-lg border p-4 ${selectedMethod === 'bank' ? 'border-primary-container bg-surface' : 'border-outline-variant bg-surface'}`}
          onPress={() => onSelectMethod('bank')}
        >
          <View className="flex-row items-center gap-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
              <AppIcon name="bank" className="text-primary-container" />
            </View>
            <View>
              <Text className="font-medium text-on-surface">{bankCardLabel}</Text>
              <Text className="text-sm text-on-surface-variant">{bankCardNumber}</Text>
            </View>
          </View>
          <View className={`h-5 w-5 rounded-full border ${selectedMethod === 'bank' ? 'border-primary bg-primary' : 'border-outline-variant'}`} />
        </Pressable>
        <Pressable
          className={`flex-row items-center justify-between rounded-lg border p-4 ${selectedMethod === 'cash' ? 'border-primary-container bg-surface' : 'border-outline-variant bg-surface'}`}
          onPress={() => onSelectMethod('cash')}
        >
          <View className="flex-row items-center gap-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
              <AppIcon name="settings" className="text-primary-container" />
            </View>
            <View>
              <Text className="font-medium text-on-surface">{servicePointLabel}</Text>
              <Text className="text-sm text-on-surface-variant">{servicePointName}</Text>
            </View>
          </View>
          <View className={`h-5 w-5 rounded-full border ${selectedMethod === 'cash' ? 'border-primary bg-primary' : 'border-outline-variant'}`} />
        </Pressable>
      </View>
      <View className="min-h-8" />
      <Button className={`h-14 ${submitDisabled ? 'bg-dot-off' : 'bg-primary-container'}`} disabled={submitDisabled} loading={submitLoading} onPress={onSubmit}>{submitLabel}</Button>
      <Text className="mt-1 text-center text-sm text-on-surface-variant">{note}</Text>
    </View>
  );
}
