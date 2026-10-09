import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { WithdrawForm } from '../../src/components/business/WithdrawForm';
import { showToast } from '../../src/components/feedback/Toast';
import { AppIcon } from '../../src/components/ui';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useEarningSummary, useCreateWithdrawal } from '../../src/services/queries/useEarnings';
import { formatCurrency } from '../../src/utils/format';
import type { PayoutChannel } from '../../src/types/earnings';

// 批1 T6（D10）：撤只读占位（FORCE_MOCK=false 后端点就绪），建真实提现表单。
// 金额 UI 美元输入、service 层 ×100 分提交；channel 四选一；account 必填；
// E-SETTLE-001 按 ApiError.code 映射提示（原 e.message 字符串匹配技术债随占位态一并退役）。

const CHANNEL_OPTIONS: { value: PayoutChannel; labelKey: string }[] = [
  { value: 'BANK_TRANSFER', labelKey: 'withdraw.channel.bankTransfer' },
  { value: 'WECHAT', labelKey: 'withdraw.channel.wechat' },
  { value: 'ALIPAY', labelKey: 'withdraw.channel.alipay' },
  { value: 'PAYPAL', labelKey: 'withdraw.channel.paypal' },
];

export default function WithdrawalPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/earnings');
  const [channel, setChannel] = useState<PayoutChannel>('BANK_TRANSFER');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [holderName, setHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const { data: summary } = useEarningSummary();
  const createWithdrawal = useCreateWithdrawal();

  // B1: 成功后 800ms 跳转的定时器，卸载时清理
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    },
    [],
  );

  // E2 §3.4: 金额输入小数位限制——只允许数字和一个小数点，小数点后最多 2 位。
  const handleAmountChange = (value: string) => {
    const matched = value.match(/^\d*\.?\d{0,2}/);
    setAmount(matched ? matched[0] : '');
  };

  // E2 §3.5: 「全部提现」一键填入可用余额（保留 2 位小数）
  const handleWithdrawAll = () => {
    if (summary == null) return;
    setAmount(summary.availableBalance.toFixed(2));
  };

  const parsedAmount = Number.parseFloat(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const accountValid = account.trim().length > 0;
  const exceedsBalance = summary != null && parsedAmount > summary.availableBalance;
  const submitLabel =
    status === 'processing'
      ? t('withdraw.processing')
      : status === 'success'
        ? t('withdraw.success')
        : t('withdraw.submit');
  const submitDisabled =
    status === 'processing' ||
    status === 'success' ||
    !amountValid ||
    !accountValid ||
    exceedsBalance;

  // 批1 T6（D10）：错误按 ApiError.code 映射（rider api throwApiError=true）。
  // E-SETTLE-001 = 余额不足；其余按 networkError/failed 兜底。
  const resolveErrorMessage = (e: unknown): string => {
    const err = e as { code?: string; message?: string };
    if (err?.code === 'E-SETTLE-001') return t('withdraw.exceedsBalance');
    if (!err?.message) return t('common.networkError');
    return t('withdraw.failed');
  };

  // N-P2-6（D6）：useRef 同步置位锁——state 守卫是异步的，同帧双击两请求都过守卫；
  // ref 同步写入第一击即生效（对齐仓内其它提交点 ref 锁惯例），state 守卫保留为第二层（按钮 disabled）
  const submitLockRef = useRef(false);

  const submit = async () => {
    if (!amountValid || !accountValid || status === 'processing' || status === 'success') return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setStatus('processing');
    try {
      await createWithdrawal.mutateAsync({
        amount: parsedAmount,
        channel,
        account: account.trim(),
        ...(holderName.trim() ? { holderName: holderName.trim() } : {}),
        ...(channel === 'BANK_TRANSFER' && bankName.trim() ? { bankName: bankName.trim() } : {}),
        ...(channel === 'BANK_TRANSFER' && branchName.trim()
          ? { branchName: branchName.trim() }
          : {}),
      });
      setStatus('success');
      // E2 §3.3: 成功 toast——跳转后仍可见（ToastHost 全局挂载）
      showToast(t('withdraw.success'), 'success');
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      redirectTimer.current = setTimeout(() => {
        redirectTimer.current = null;
        router.replace('/(main)/earnings');
      }, 800);
    } catch (e) {
      submitLockRef.current = false; // N-P2-6：失败放行，允许用户改后重试
      setStatus('error');
      showToast(resolveErrorMessage(e), 'error');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center border-b border-surface-variant bg-surface px-5 py-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-container"
          onPress={() => void goBack()}
        >
          <AppIcon className="text-2xl text-on-surface" name="chevronLeft" size={28} />
        </Pressable>
        <Text className="ml-2 text-xl font-semibold text-on-surface">{t('withdraw.title')}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="mx-auto w-full max-w-lg gap-6 px-5 py-6"
      >
        <View className="items-center justify-center rounded-xl border border-surface-container-high bg-surface-container p-6 shadow-sm">
          <Text className="mb-1 text-sm text-on-surface-variant">
            {t('withdraw.availableBalance')}
          </Text>
          <Text className="text-[32px] font-bold tracking-tight text-on-surface">
            {summary ? formatCurrency(summary.availableBalance, t('common.currency')) : '—'}
          </Text>
        </View>

        <WithdrawForm
          amount={amount}
          amountLabel={t('withdraw.amountLabel')}
          amountPlaceholder={t('withdraw.amountPlaceholder')}
          account={account}
          accountLabel={t('withdraw.accountLabel')}
          accountPlaceholder={t('withdraw.accountPlaceholder')}
          accountRequiredHint={
            !accountValid && account.length > 0 ? t('withdraw.accountRequired') : ''
          }
          bankName={bankName}
          bankNameLabel={t('withdraw.bankNameLabel')}
          branchName={branchName}
          branchNameLabel={t('withdraw.branchNameLabel')}
          channelLabel={t('withdraw.channelLabel')}
          channelOptions={CHANNEL_OPTIONS.map((o) => ({
            value: o.value,
            label: t(o.labelKey as 'withdraw.channel.bankTransfer'),
          }))}
          exceedsHint={exceedsBalance ? t('withdraw.exceedsBalance') : ''}
          holderName={holderName}
          holderNameLabel={t('withdraw.holderNameLabel')}
          note={t('withdraw.noteNextDay')}
          selectedChannel={channel}
          submitDisabled={submitDisabled}
          submitLabel={submitLabel}
          submitLoading={status === 'processing'}
          withdrawAllLabel={t('withdraw.withdrawAll')}
          onAccountChange={setAccount}
          onAmountChange={handleAmountChange}
          onBankNameChange={setBankName}
          onBranchNameChange={setBranchName}
          onHolderNameChange={setHolderName}
          onSelectChannel={setChannel}
          onSubmit={() => void submit()}
          onWithdrawAll={() => void handleWithdrawAll()}
        />
      </ScrollView>
    </View>
  );
}
