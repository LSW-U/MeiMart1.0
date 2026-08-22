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

export default function WithdrawalPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/earnings');
  const [method, setMethod] = useState<'bank' | 'cash'>('bank');
  const [amount, setAmount] = useState('');
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
  // （onAmountChange 中过滤，非 maxLength——避免多输入时直接吞掉光标）
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
  const exceedsBalance = summary != null && parsedAmount > summary.availableBalance;
  const submitLabel = status === 'processing' ? t('withdraw.processing') : status === 'success' ? t('withdraw.success') : t('withdraw.submit');
  const submitDisabled = status === 'processing' || status === 'success' || !amountValid || exceedsBalance;

  // E2 §3.2: 错误映射——createWithdrawal 抛裸 Error（非 ApiError，无 code/status），
  // 按 e.message 字符串匹配到 i18n key。W6+ 后端实现真实端点时应改抛 ApiError 带 code，
  // 届时改用 code 判断（与 acceptTask 范式统一），此处字符串匹配为技术债。
  const resolveErrorMessage = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Insufficient balance')) return t('withdraw.exceedsBalance');
    if (!msg || msg.includes('not available')) return t('common.networkError');
    return t('withdraw.failed');
  };

  const submit = async () => {
    if (!amountValid || status === 'processing' || status === 'success') return;
    setStatus('processing');
    try {
      await createWithdrawal.mutateAsync({ amount: parsedAmount, method });
      setStatus('success');
      // E2 §3.3: 成功 toast——跳转后仍可见（ToastHost 全局挂载）
      showToast(t('withdraw.success'), 'success');
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      redirectTimer.current = setTimeout(() => {
        redirectTimer.current = null;
        router.replace('/(main)/earnings');
      }, 800);
    } catch (e) {
      // E2 §3.2: error 改 toast（移除内联 error Text），保留 'error' 态让 submitLabel 回 submit 可重提
      setStatus('error');
      showToast(resolveErrorMessage(e), 'error');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center border-b border-surface-variant bg-surface px-5 py-4">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-container" onPress={() => void goBack()}>
          <AppIcon className="text-2xl text-on-surface" name="chevronLeft" size={28} />
        </Pressable>
        <Text className="ml-2 text-xl font-semibold text-on-surface">{t('withdraw.title')}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-lg gap-6 px-5 py-6">
        <View className="items-center justify-center rounded-xl border border-surface-container-high bg-surface-container p-6 shadow-sm">
          <Text className="mb-1 text-sm text-on-surface-variant">{t('withdraw.availableBalance')}</Text>
          <Text className="text-[32px] font-bold tracking-tight text-on-surface">
            {summary ? formatCurrency(summary.availableBalance, t('common.currency')) : '—'}
          </Text>
        </View>

        <WithdrawForm
          amount={amount}
          amountLabel={t('withdraw.amountLabel')}
          amountPlaceholder={t('withdraw.amountPlaceholder')}
          bankCardLabel={t('withdraw.bankCard')}
          bindEntryLabel={t('withdraw.unboundCard')}
          exceedsHint={exceedsBalance ? t('withdraw.exceedsBalance') : ''}
          note={t('withdraw.note')}
          selectedMethod={method}
          servicePointLabel={t('withdraw.servicePoint')}
          servicePointSub={t('withdraw.unboundServicePoint')}
          submitDisabled={submitDisabled}
          submitLabel={submitLabel}
          submitLoading={status === 'processing'}
          toLabel={t('withdraw.toLabel')}
          withdrawAllLabel={t('withdraw.withdrawAll')}
          onAmountChange={handleAmountChange}
          onBindComingSoon={() => showToast(t('withdraw.bindComingSoon'), 'info')}
          onSelectMethod={setMethod}
          onSubmit={() => void submit()}
          onWithdrawAll={() => void handleWithdrawAll()}
        />
      </ScrollView>
    </View>
  );
}
