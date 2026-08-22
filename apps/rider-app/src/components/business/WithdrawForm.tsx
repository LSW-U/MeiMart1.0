import { colors } from "../../theme/colors";
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppIcon, Button } from '../ui';

type WithdrawFormProps = {
  amountLabel: string;
  amountPlaceholder: string;
  toLabel: string;
  bankCardLabel: string;
  bindEntryLabel: string;
  servicePointLabel: string;
  servicePointSub: string;
  submitLabel: string;
  submitLoading?: boolean;
  note: string;
  exceedsHint: string;
  withdrawAllLabel: string;
  selectedMethod: 'bank' | 'cash';
  amount: string;
  onAmountChange: (value: string) => void;
  submitDisabled?: boolean;
  onSelectMethod: (method: 'bank' | 'cash') => void;
  onSubmit: () => void;
  onWithdrawAll: () => void;
};

type RadioDotProps = { checked: boolean };

// E2 §3.6: 圆点内圆填充——外圈 border-primary + 内圈 10px bg-primary 实心点（非整体填充）
function RadioDot({ checked }: RadioDotProps) {
  return (
    <View className={`h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${checked ? 'border-primary' : 'border-outline-variant'}`}>
      <View className={`h-2.5 w-2.5 rounded-full ${checked ? 'bg-primary' : 'bg-transparent'}`} />
    </View>
  );
}

export function WithdrawForm({
  amountLabel,
  amountPlaceholder,
  toLabel,
  bankCardLabel,
  bindEntryLabel,
  servicePointLabel,
  servicePointSub,
  submitLabel,
  submitLoading = false,
  note,
  exceedsHint,
  withdrawAllLabel,
  selectedMethod,
  amount,
  onAmountChange,
  submitDisabled,
  onSelectMethod,
  onSubmit,
  onWithdrawAll,
}: WithdrawFormProps) {
  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{amountLabel}</Text>
        {/* E2 §3.4/§3.5: 金额框 + 右侧「全部提现」按钮（原型 .amount-wrap + .withdraw-all-btn） */}
        <View className="relative">
          <TextInput
            className="rounded-lg border-2 border-outline-variant bg-surface px-8 py-2 text-lg text-on-surface"
            keyboardType="numeric"
            placeholder={amountPlaceholder}
            placeholderTextColor={colors.outline}
            value={amount}
            onChangeText={onAmountChange}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={withdrawAllLabel}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-surface-container-low px-3 py-1.5"
            onPress={onWithdrawAll}
          >
            <Text className="text-xs font-extrabold text-primary">{withdrawAllLabel}</Text>
          </Pressable>
        </View>
        {/* E2 §3.2: 超额提示统一到输入框下方（原型 .exceeds-hint） */}
        {exceedsHint ? <Text className="mt-1.5 text-xs font-semibold text-status-danger-text">{exceedsHint}</Text> : null}
      </View>
      <View className="mt-2 gap-2">
        <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{toLabel}</Text>
        {/* E2 §3.6: bank Pressable 加 radio 语义 + 占位态（原型 .method-sub.unbound warn-text） */}
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: selectedMethod === 'bank' }}
          className={`flex-row items-center justify-between rounded-lg border p-4 ${selectedMethod === 'bank' ? 'border-primary-container bg-surface' : 'border-outline-variant bg-surface'}`}
          onPress={() => onSelectMethod('bank')}
        >
          <View className="flex-row items-center gap-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
              <AppIcon name="bank" className="text-primary-container" />
            </View>
            <View>
              <Text className="font-medium text-on-surface">{bankCardLabel}</Text>
              <Text className="text-sm font-semibold text-warn-text">{bindEntryLabel}</Text>
            </View>
          </View>
          <RadioDot checked={selectedMethod === 'bank'} />
        </Pressable>
        {/* E2 §3.6: cash Pressable a11y + cash 图标（②A，hand-coin-outline） */}
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: selectedMethod === 'cash' }}
          className={`flex-row items-center justify-between rounded-lg border p-4 ${selectedMethod === 'cash' ? 'border-primary-container bg-surface' : 'border-outline-variant bg-surface'}`}
          onPress={() => onSelectMethod('cash')}
        >
          <View className="flex-row items-center gap-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
              <AppIcon name="cash" className="text-primary-container" />
            </View>
            <View>
              <Text className="font-medium text-on-surface">{servicePointLabel}</Text>
              <Text className="text-sm font-semibold text-warn-text">{servicePointSub}</Text>
            </View>
          </View>
          <RadioDot checked={selectedMethod === 'cash'} />
        </Pressable>
        {/* E2 §3.1: 绑定入口（W6+，原型 .bind-entry surface-low 虚线边框 primary 文字） */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={bindEntryLabel}
          className="mt-2 flex-row items-center gap-1.5 self-start rounded-lg border border-dashed border-outline bg-surface-container-low px-3.5 py-2.5"
          onPress={() => onSelectMethod(selectedMethod)}
        >
          <AppIcon name="plus" className="text-primary" size={14} />
          <Text className="text-xs font-semibold text-primary">{bindEntryLabel}</Text>
        </Pressable>
      </View>
      <Button className={`mt-2 h-14 ${submitDisabled ? 'bg-dot-off' : 'bg-primary-container'}`} disabled={submitDisabled} loading={submitLoading} onPress={onSubmit}>
        {submitLabel}
      </Button>
      <Text className="mt-1 text-center text-sm text-on-surface-variant">{note}</Text>
    </View>
  );
}
