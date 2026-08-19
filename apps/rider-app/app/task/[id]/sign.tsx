import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { EvidenceExample, EvidenceUpload } from '../../../src/components/camera/SignaturePad';
import { StepPageHeader } from '../../../src/components/layout/StepPageHeader';
import { showToast } from '../../../src/components/feedback/Toast';
import { ApiError } from '../../../src/services/api';
import { Button, Input } from '../../../src/components/ui';
import { AppIcon } from '../../../src/components/ui/AppIcon';
import { colors } from '../../../src/theme/colors';
import { useNetwork } from '../../../src/hooks/useNetwork';
import { useTranslation } from '../../../src/i18n/useTranslation';
import { useConfirmDelivery } from '../../../src/services/queries/useDelivery';
import { useTask } from '../../../src/services/queries/useTask';
import { formatCurrency } from '../../../src/utils/format';

const doorExampleUri = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMHfhBvHWt0EecfMzNQjHgZFZdCRkcX5m9k6xbe1n5-EuFhwQzbzaGDpescZFwxD6bwuFdYiDnqr0XjS4F7jp7iHOsTQZsAYXd4v1pQE4cTFZCj8xdbHqm0VafUAXRae7WVXt0tG_RkbJtgmY__0k2-My2H5W_HoUKhk712Vr-w-zh5rwImNXPpXr2gH5MmFWODGepHtni4Ewasgd55Jqoon6xLKPjeix0QJrFE2KSKWYhGbqqX5omVklWn9OoJrLxpxg1G9PLEQ';
const packageExampleUri = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCKIaAFgN904UuZQyPS-CIO6WA5rJyPR3Kb9_GetDw7gCAox--tq9ZYbenQOj9DPKVlzTAXhoMzo6aPzcSwyrRgyvc0txMXchb9Q0yF0l-F0HuDclzq1gVRXnghARoPCnj-clXMfCtTWltbLzJj4jy7LcA8Evyz9IxE72TfKvDIm47Y9_LnyBovKiA9swd3jHEko3m5HbB3lPWaGP71vYmLRoInHXMThMjqrFnid0BLOlLqFU2mpH2nPDcFNwFVsEkCUCFOWTlaA';

export default function SignConfirmPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [doorCaptured, setDoorCaptured] = useState(false);
  const [packageCaptured, setPackageCaptured] = useState(false);
  const [doorUri, setDoorUri] = useState('');
  const [packageUri, setPackageUri] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  // COD 实收金额（元，输入框字符串）；后端要分，提交时转换
  const [collectedInput, setCollectedInput] = useState('');
  const confirmDelivery = useConfirmDelivery();
  const { isOffline } = useNetwork();
  const { data: task } = useTask(id);

  // B1: 成功后 500ms 跳转的定时器，卸载时清理（避免快速返回后跳转/状态异常）
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    },
    [],
  );

  // Why: sign 页只允许 PICKED_UP/DELIVERING（可送达）进入。
  //   DELIVERED 已送达 / 其他状态弹回 detail。防止重复送达 409（对称 pickup/navigate 守卫）。
  //   基于缓存：守卫读 useTask 缓存（S3），极端竞态下仍可能 409，由提交 toast 兜底（审查 A4）
  useEffect(() => {
    if (!task) return;
    if (task.status === 'PICKED_UP' || task.status === 'DELIVERING') return;
    router.replace(`/task/${id}`);
  }, [task, id, router]);

  // COD 判断 + 应收展示（后端单位分，展示转元）
  const isCod = task?.paymentMethod === 'COD';
  const payable = (task?.payableAmount ?? 0) / 100;

  const canSubmit = doorCaptured && packageCaptured && status !== 'processing';

  // B1: COD 实收金额有效性（与提交时判定一致：parseFloat 非 NaN 且 ≥ 0）
  const codAmountInvalid = isCod && !(Number.isFinite(Number.parseFloat(collectedInput)) && Number.parseFloat(collectedInput) >= 0);
  const submitDisabled = !canSubmit || status === 'success' || codAmountInvalid;

  const handleConfirmDelivery = async () => {
    if (!canSubmit) return;

    // COD 必填实收金额：后端不传 collectedAmount 默认记 UNPAID（a664 实证），必须显式输入
    if (isCod) {
      const parsed = Number.parseFloat(collectedInput);
      if (!Number.isFinite(parsed) || parsed < 0) {
        showToast(t('sign.codRequired'), 'error');
        return;
      }
    }

    setStatus('processing');
    try {
      await confirmDelivery.mutateAsync({
        taskId: id,
        evidence: { doorUri, packageUri },
        collectedAmount: isCod ? Math.round(Number.parseFloat(collectedInput) * 100) : undefined,
      });
      if (isOffline) showToast(t('common.savedOffline'), 'info');
      setStatus('success');
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      redirectTimer.current = setTimeout(() => {
        redirectTimer.current = null;
        router.replace('/(main)/tasks?tab=deliveries');
      }, 500);
    } catch (e) {
      setStatus('idle');
      // ApiError 差异化：业务失败（送达冲突）vs 网络
      const msg = e instanceof ApiError ? t('sign.failed') : t('common.networkError');
      showToast(msg, 'error');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StepPageHeader backLabel={t('common.back')} title={t('sign.title')} />

      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 pb-40 pt-4">
        <View className="flex-row items-start gap-4 rounded-lg bg-primary-container p-4 shadow-sm">
          <AppIcon color={colors.surface} name="info" size={20} />
          <Text className="flex-1 font-semibold leading-5 text-white">{t('sign.alert')}</Text>
        </View>

        {isCod ? (
          <View className="gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('sign.codPayable')}</Text>
              <Text className="text-xl font-bold text-primary">{formatCurrency(payable, t('common.currency'))}</Text>
            </View>
            <Input
              keyboardType="decimal-pad"
              label={t('sign.codCollected')}
              placeholder={t('sign.codCollectedPlaceholder')}
              value={collectedInput}
              onChangeText={setCollectedInput}
            />
            <Text className="text-[11px] leading-4 text-on-surface-variant opacity-80">{t('sign.codHint')}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          <Text className="px-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('sign.referenceExamples')}</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <EvidenceExample label={t('sign.doorExample')} uri={doorExampleUri} />
            </View>
            <View className="flex-1">
              <EvidenceExample label={t('sign.packageExample')} uri={packageExampleUri} />
            </View>
          </View>
        </View>

        <View className="gap-6 pt-2">
          <EvidenceUpload
            actionLabel={t('sign.tapPhoto')}
            captured={doorCaptured}
            capturedLabel={t('sign.photoCaptured')}
            required
            title={t('sign.doorNumber')}
            photoUri={doorUri}
            onPermissionDenied={() => showToast(t('common.cameraPermissionDenied'), 'error')}
            onError={() => showToast(t('common.cameraError'), 'error')}
            onPress={(uri) => { setDoorCaptured(true); setDoorUri(uri); }}
          />
          <EvidenceUpload
            actionLabel={t('sign.tapPhoto')}
            captured={packageCaptured}
            capturedLabel={t('sign.photoCaptured')}
            required
            title={t('sign.packageImage')}
            photoUri={packageUri}
            onPermissionDenied={() => showToast(t('common.cameraPermissionDenied'), 'error')}
            onError={() => showToast(t('common.cameraError'), 'error')}
            onPress={(uri) => { setPackageCaptured(true); setPackageUri(uri); }}
          />
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 gap-2 bg-surface px-5 py-4 shadow-lg">
        <Button
          className={canSubmit && !codAmountInvalid ? 'bg-primary-container' : 'bg-neutral-muted'}
          disabled={submitDisabled}
          loading={status === 'processing'}
          onPress={() => void handleConfirmDelivery()}
        >
          {status === 'processing' ? t('flow.processing') : status === 'success' ? t('sign.success') : t('sign.confirm')}
        </Button>
        <Text className="mx-auto max-w-[280px] text-center text-[11px] leading-5 text-on-surface-variant opacity-80">
          {status === 'success' ? t('sign.confirmed') : t('sign.disputeProof')}
        </Text>
      </View>
    </View>
  );
}
