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
  note: string;
  selectedMethod: 'bank' | 'cash';
  onSelectMethod: (method: 'bank' | 'cash') => void;
  onSubmit: () => void;
};

export function WithdrawForm({ amountLabel, amountPlaceholder, toLabel, bankCardLabel, bankCardNumber, servicePointLabel, servicePointName, submitLabel, note, selectedMethod, onSelectMethod, onSubmit }: WithdrawFormProps) {
  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-xs font-bold uppercase tracking-wider text-[#59413d]">{amountLabel}</Text>
        <TextInput
          className="rounded-lg border-2 border-[#e1bfba] bg-[#fff8f7] px-8 py-2 text-lg text-[#261816]"
          keyboardType="numeric"
          placeholder={amountPlaceholder}
          placeholderTextColor="#8d706c"
        />
      </View>
      <View className="mt-2 gap-2">
        <Text className="text-xs font-bold uppercase tracking-wider text-[#59413d]">{toLabel}</Text>
        <Pressable
          className={`flex-row items-center justify-between rounded-lg border p-4 ${selectedMethod === 'bank' ? 'border-[#961813] bg-[#fff8f7]' : 'border-[#e1bfba] bg-[#fff8f7]'}`}
          onPress={() => onSelectMethod('bank')}
        >
          <View className="flex-row items-center gap-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#fde2df]">
              <AppIcon name="bank" className="text-[#961813]" />
            </View>
            <View>
              <Text className="font-medium text-[#261816]">{bankCardLabel}</Text>
              <Text className="text-sm text-[#59413d]">{bankCardNumber}</Text>
            </View>
          </View>
          <View className={`h-5 w-5 rounded-full border ${selectedMethod === 'bank' ? 'border-[#720003] bg-[#720003]' : 'border-[#e1bfba]'}`} />
        </Pressable>
        <Pressable
          className={`flex-row items-center justify-between rounded-lg border p-4 ${selectedMethod === 'cash' ? 'border-[#961813] bg-[#fff8f7]' : 'border-[#e1bfba] bg-[#fff8f7]'}`}
          onPress={() => onSelectMethod('cash')}
        >
          <View className="flex-row items-center gap-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#fde2df]">
              <AppIcon name="settings" className="text-[#961813]" />
            </View>
            <View>
              <Text className="font-medium text-[#261816]">{servicePointLabel}</Text>
              <Text className="text-sm text-[#59413d]">{servicePointName}</Text>
            </View>
          </View>
          <View className={`h-5 w-5 rounded-full border ${selectedMethod === 'cash' ? 'border-[#720003] bg-[#720003]' : 'border-[#e1bfba]'}`} />
        </Pressable>
      </View>
      <View className="min-h-8" />
      <Button className="h-14 bg-[#961813]" onPress={onSubmit}>{submitLabel}</Button>
      <Text className="mt-1 text-center text-sm text-[#59413d]">{note}</Text>
    </View>
  );
}
