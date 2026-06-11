import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { WithdrawForm } from '../../src/components/business/WithdrawForm';
import { useTranslation } from '../../src/i18n/useTranslation';
import { createWithdrawal } from '../../src/services/earnings';

export default function WithdrawalPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [method, setMethod] = useState<'bank' | 'cash'>('bank');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const parsedAmount = Number.parseFloat(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const submitLabel = status === 'processing' ? t('withdraw.processing') : status === 'success' ? t('withdraw.success') : t('withdraw.submit');
  const submitDisabled = status !== 'idle' || !amountValid;

  const submit = async () => {
    if (!amountValid) return;
    setStatus('processing');
    await createWithdrawal(parsedAmount, method);
    setStatus('success');
  };

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <View className="flex-row items-center border-b border-[#f7ddd9] bg-[#fff8f7] px-5 py-4">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full active:bg-[#ffe9e6]" onPress={() => router.back()}>
          <Text className="text-2xl text-[#261816]">‹</Text>
        </Pressable>
        <Text className="ml-2 text-xl font-semibold text-[#261816]">{t('withdraw.title')}</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="mx-auto w-full max-w-lg gap-6 px-5 py-6">
        <View className="items-center justify-center rounded-xl border border-[#fde2df] bg-[#ffe9e6] p-6 shadow-sm">
          <Text className="mb-1 text-sm text-[#59413d]">{t('withdraw.availableBalance')}</Text>
          <Text className="text-[32px] font-bold tracking-tight text-[#261816]">{t('withdraw.availableAmount')}</Text>
        </View>

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
