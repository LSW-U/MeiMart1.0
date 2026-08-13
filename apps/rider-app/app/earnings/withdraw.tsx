import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { WithdrawForm } from '../../src/components/business/WithdrawForm';
import { useGoBack } from '../../src/hooks/useGoBack';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useEarningSummary, useCreateWithdrawal } from '../../src/services/queries/useEarnings';

export default function WithdrawalPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/earnings');
  const [method, setMethod] = useState<'bank' | 'cash'>('bank');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const { data: summary } = useEarningSummary();
  const createWithdrawal = useCreateWithdrawal();

  const parsedAmount = Number.parseFloat(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const exceedsBalance = summary != null && parsedAmount > summary.availableBalance;
  const submitLabel = status === 'processing' ? t('withdraw.processing') : status === 'success' ? t('withdraw.success') : t('withdraw.submit');
  const submitDisabled = status !== 'idle' || !amountValid || exceedsBalance;

  const submit = async () => {
    if (!amountValid) return;
    setStatus('processing');
    setErrorMsg('');
    try {
      await createWithdrawal.mutateAsync({ amount: parsedAmount, method });
      setStatus('success');
      setTimeout(() => router.replace('/(main)/earnings'), 800);
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : t('withdraw.failed'));
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-row items-center border-b border-surface-variant bg-surface px-5 py-4">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} className="h-10 w-10 items-center justify-center rounded-full active:bg-surface-container" onPress={() => void goBack()}>
          <Text className="text-2xl text-on-surface">‹</Text>
        </Pressable>
        <Text className="ml-2 text-xl font-semibold text-on-surface">{t('withdraw.title')}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-lg gap-6 px-5 py-6">
        <View className="items-center justify-center rounded-xl border border-surface-container-high bg-surface-container p-6 shadow-sm">
          <Text className="mb-1 text-sm text-on-surface-variant">{t('withdraw.availableBalance')}</Text>
          <Text className="text-[32px] font-bold tracking-tight text-on-surface">
            {summary ? `${t('common.currency')}${summary.availableBalance.toFixed(2)}` : '—'}
          </Text>
        </View>

        {exceedsBalance ? (
          <Text className="text-center text-sm text-[#a3322a]">{t('withdraw.exceedsBalance')}</Text>
        ) : null}
        {status === 'error' ? (
          <Text className="text-center text-sm text-[#a3322a]">{errorMsg}</Text>
        ) : null}

        <WithdrawForm
          amount={amount}
          amountLabel={t('withdraw.amountLabel')}
          amountPlaceholder={t('withdraw.amountPlaceholder')}
          bankCardLabel={t('withdraw.bankCard')}
          bankCardNumber={t('withdraw.bankCardNumber')}
          note={t('withdraw.note')}
          selectedMethod={method}
          servicePointLabel={t('withdraw.servicePoint')}
          servicePointName={t('withdraw.servicePointName')}
          submitDisabled={submitDisabled}
          submitLabel={submitLabel}
          toLabel={t('withdraw.toLabel')}
          onAmountChange={setAmount}
          onSelectMethod={setMethod}
          onSubmit={() => void submit()}
        />
      </ScrollView>
    </View>
  );
}
