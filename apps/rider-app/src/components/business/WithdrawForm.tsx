import { colors } from '../../theme/colors';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppIcon, Button } from '../ui';
import type { AppIconName } from '../ui';
import type { PayoutChannel } from '../../types/earnings';

/**
 * 批1 T6（D10）：提现表单重做——payout channel 四选一（BANK_TRANSFER/WECHAT/ALIPAY/PAYPAL）
 * + account 必填 + holderName/bankName/branchName 选填（金额输入沿用 E2 §3.4/§3.5 交互）。
 * 原 bank|cash 双 radio + 未绑定占位 + 绑定入口（W6+ 占位）随 mock 退役一并移除。
 */
type WithdrawFormProps = {
  amountLabel: string;
  amountPlaceholder: string;
  channelLabel: string;
  channelOptions: { value: PayoutChannel; label: string }[];
  accountLabel: string;
  accountPlaceholder: string;
  holderNameLabel: string;
  bankNameLabel: string;
  branchNameLabel: string;
  submitLabel: string;
  submitLoading?: boolean;
  note: string;
  exceedsHint: string;
  accountRequiredHint: string;
  withdrawAllLabel: string;
  amount: string;
  account: string;
  holderName: string;
  bankName: string;
  branchName: string;
  selectedChannel: PayoutChannel;
  onAmountChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  onHolderNameChange: (value: string) => void;
  onBankNameChange: (value: string) => void;
  onBranchNameChange: (value: string) => void;
  onSelectChannel: (channel: PayoutChannel) => void;
  onSubmit: () => void;
  onWithdrawAll: () => void;
  submitDisabled?: boolean;
};

type RadioDotProps = { checked: boolean };

// E2 §3.6: 圆点内圆填充——外圈 border-primary + 内圈 10px bg-primary 实心点（非整体填充）
function RadioDot({ checked }: RadioDotProps) {
  return (
    <View
      className={`h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${checked ? 'border-primary' : 'border-outline-variant'}`}
    >
      <View className={`h-2.5 w-2.5 rounded-full ${checked ? 'bg-primary' : 'bg-transparent'}`} />
    </View>
  );
}

/** 渠道图标映射（AppIconName 联合类型内既有名，审查 P2-1 修：globe 不存在会静默空渲染） */
const CHANNEL_ICON: Record<PayoutChannel, AppIconName> = {
  BANK_TRANSFER: 'bank',
  WECHAT: 'chat',
  ALIPAY: 'wallet',
  PAYPAL: 'shield',
};

export function WithdrawForm({
  amountLabel,
  amountPlaceholder,
  channelLabel,
  channelOptions,
  accountLabel,
  accountPlaceholder,
  holderNameLabel,
  bankNameLabel,
  branchNameLabel,
  submitLabel,
  submitLoading = false,
  note,
  exceedsHint,
  accountRequiredHint,
  withdrawAllLabel,
  amount,
  account,
  holderName,
  bankName,
  branchName,
  selectedChannel,
  onAmountChange,
  onAccountChange,
  onHolderNameChange,
  onBankNameChange,
  onBranchNameChange,
  onSelectChannel,
  onSubmit,
  onWithdrawAll,
  submitDisabled,
}: WithdrawFormProps) {
  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          {amountLabel}
        </Text>
        {/* E2 §3.4/§3.5: 金额框 + 右侧「全部提现」按钮（原型 .amount-wrap + .withdraw-all-btn） */}
        <View className="relative">
          <TextInput
            className="rounded-lg border-2 border-outline-variant bg-surface px-8 py-2 text-lg text-on-surface"
            keyboardType="numeric"
            accessibilityLabel={amountLabel}
            placeholder={amountPlaceholder}
            placeholderTextColor={colors.outline}
            value={amount}
            onChangeText={onAmountChange}
            testID="withdraw-amount-input"
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
        {exceedsHint ? (
          <Text className="mt-1.5 text-xs font-semibold text-status-danger-text">
            {exceedsHint}
          </Text>
        ) : null}
      </View>

      {/* D10: payout channel 四选一 */}
      <View className="mt-2 gap-2">
        <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          {channelLabel}
        </Text>
        {channelOptions.map((opt) => {
          const checked = opt.value === selectedChannel;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={opt.label}
              testID={`withdraw-channel-${opt.value}`}
              className={`flex-row items-center justify-between rounded-lg border p-4 ${checked ? 'border-primary-container bg-surface' : 'border-outline-variant bg-surface'}`}
              onPress={() => onSelectChannel(opt.value)}
            >
              <View className="flex-row items-center gap-4">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
                  <AppIcon name={CHANNEL_ICON[opt.value]} className="text-primary-container" />
                </View>
                <Text className="font-medium text-on-surface">{opt.label}</Text>
              </View>
              <RadioDot checked={checked} />
            </Pressable>
          );
        })}
      </View>

      {/* D10: account 必填 + holderName/bankName/branchName 选填 */}
      <View className="gap-1">
        <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          {accountLabel}
        </Text>
        <TextInput
          className="rounded-lg border-2 border-outline-variant bg-surface px-4 py-2 text-base text-on-surface"
          accessibilityLabel={accountLabel}
          placeholder={accountPlaceholder}
          placeholderTextColor={colors.outline}
          value={account}
          onChangeText={onAccountChange}
          autoCapitalize="none"
          testID="withdraw-account-input"
        />
        {accountRequiredHint ? (
          <Text className="mt-1 text-xs font-semibold text-status-danger-text">
            {accountRequiredHint}
          </Text>
        ) : null}
      </View>

      <View className="gap-2">
        <TextInput
          className="rounded-lg border border-outline-variant bg-surface px-4 py-2 text-base text-on-surface"
          accessibilityLabel={holderNameLabel}
          placeholder={holderNameLabel}
          placeholderTextColor={colors.outline}
          value={holderName}
          onChangeText={onHolderNameChange}
          testID="withdraw-holder-input"
        />
        {selectedChannel === 'BANK_TRANSFER' ? (
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-base text-on-surface"
              accessibilityLabel={bankNameLabel}
              placeholder={bankNameLabel}
              placeholderTextColor={colors.outline}
              value={bankName}
              onChangeText={onBankNameChange}
              testID="withdraw-bankname-input"
            />
            <TextInput
              className="flex-1 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-base text-on-surface"
              accessibilityLabel={branchNameLabel}
              placeholder={branchNameLabel}
              placeholderTextColor={colors.outline}
              value={branchName}
              onChangeText={onBranchNameChange}
              testID="withdraw-branch-input"
            />
          </View>
        ) : null}
      </View>

      <Button
        className={`mt-2 h-14 ${submitDisabled ? 'bg-dot-off' : 'bg-primary-container'}`}
        disabled={submitDisabled}
        loading={submitLoading}
        onPress={onSubmit}
      >
        {submitLabel}
      </Button>
      <Text className="mt-1 text-center text-sm text-on-surface-variant">{note}</Text>
    </View>
  );
}
