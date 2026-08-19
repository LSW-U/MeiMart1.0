import { useLocalSearchParams, useRouter } from 'expo-router';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { EvidenceExample, EvidenceUpload } from '../../../src/components/camera/SignaturePad';
import { QueryBoundary } from '../../../src/components/feedback/QueryBoundary';
import { showToast } from '../../../src/components/feedback/Toast';
import { StepPageHeader } from '../../../src/components/layout/StepPageHeader';
import { ApiError } from '../../../src/services/api';
import { Button, Input } from '../../../src/components/ui';
import { AppIcon } from '../../../src/components/ui/AppIcon';
import { colors } from '../../../src/theme/colors';
import { useNetwork } from '../../../src/hooks/useNetwork';
import { useTranslation } from '../../../src/i18n/useTranslation';
import { useConfirmDelivery } from '../../../src/services/queries/useDelivery';
import { useTask } from '../../../src/services/queries/useTask';
import type { DeliveryTask } from '../../../src/types/task';
import { formatCurrency } from '../../../src/utils/format';

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
  const { data: task, isLoading, isError, refetch } = useTask(id);

  // B1: 成功后跳转的定时器，卸载时清理（避免快速返回后跳转/状态异常）
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

  // COD 判断（loading 时 task=undefined → isCod=false，底栏正确禁用；应收展示在 QueryBoundary children 内基于 detail 计算）
  const isCod = task?.paymentMethod === 'COD';

  const canSubmit = doorCaptured && packageCaptured && status !== 'processing';

  // B1: COD 实收金额有效性（与提交时判定一致：parseFloat 非 NaN 且 ≥ 0）
  const codAmountInvalid = isCod && !(Number.isFinite(Number.parseFloat(collectedInput)) && Number.parseFloat(collectedInput) >= 0);
  const submitDisabled = !canSubmit || status === 'success' || codAmountInvalid;

  const handleConfirmDelivery = async () => {
    if (!canSubmit) return;

    // 提交时从 task 重新读取 isCod（不依赖顶层 loading 期的 isCod），保证与后端 task 一致
    const codAtSubmit = task?.paymentMethod === 'COD';

    // COD 必填实收金额：后端不传 collectedAmount 默认记 UNPAID（a664 实证），必须显式输入
    if (codAtSubmit) {
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
        collectedAmount: codAtSubmit ? Math.round(Number.parseFloat(collectedInput) * 100) : undefined,
      });
      if (isOffline) showToast(t('common.savedOffline'), 'info');
      setStatus('success');
      // T5 §3.4: 成功 toast + 延长反馈 500→1200ms（骑行途中 500ms 易错过）
      showToast(t('sign.successToast'), 'success');
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      redirectTimer.current = setTimeout(() => {
        redirectTimer.current = null;
        router.replace('/(main)/tasks?tab=deliveries');
      }, 1200);
    } catch (e) {
      setStatus('idle');
      // ApiError 差异化：业务失败（送达冲突）vs 网络
      const msg = e instanceof ApiError ? t('sign.failed') : t('common.networkError');
      showToast(msg, 'error');
    }
  };

  // T5 §7.10 A: 致电客人 tel: 直拨（零后端依赖），contactPhone 缺失时不可点
  const handleCallCustomer = async () => {
    const phone = task?.dropoff.contactPhone;
    if (!phone) return;
    try {
      await Linking.openURL('tel:' + phone);
    } catch {
      showToast(t('common.callFailed'), 'error');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StepPageHeader backLabel={t('common.back')} title={t('sign.title')} />

      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 pb-40 pt-4">
        {/* T5 §3.4/L6: 成功态 alert 变绿（呼应进度条③变绿 + 按钮变绿） */}
        <View
          className="flex-row items-start gap-4 rounded-lg p-4 shadow-sm"
          style={{ backgroundColor: status === 'success' ? colors.success : colors.primary }}
        >
          <AppIcon color={colors.surface} name={status === 'success' ? 'check' : 'info'} size={20} />
          <Text className="flex-1 font-semibold leading-5 text-white">
            {status === 'success' ? t('sign.confirmed') : t('sign.alert')}
          </Text>
        </View>

        <QueryBoundary<DeliveryTask | null>
          data={task}
          isLoading={isLoading}
          isError={isError}
          isEmpty={(value) => value === null}
          errorTitle={t('common.loadError.title')}
          errorMessage={t('common.loadError.desc')}
          retryLabel={t('common.retry')}
          emptyTitle={t('common.taskNotFound')}
          emptyDescription={t('common.taskNotFoundDesc')}
          skeleton="detail"
          onRetry={() => void refetch()}
        >
          {(detail) => {
            // T5 L2: 配送进度条（取货✓→配送✓→送达●）。sign 页语义比 navigate 前进一位：
            //   PICKED_UP（已取货完，配送中）→ step=2；DELIVERING（配送完，待送达）→ step=3。
            //   成功态 stepReached=3 全绿✓（审查修复 P2-1，原照抄 navigate 的 step 推导错位）
            const step = detail.status === 'DELIVERING' ? 3 : 2;
            const stepReached = status === 'success' ? 3 : step;
            const dotState = (n: 1 | 2 | 3): 'done' | 'active' | 'todo' =>
              n < stepReached ? 'done' : n === stepReached ? 'active' : 'todo';
            const progressLabels = [
              t('tasks.deliveryProgress.pickedUp'),
              t('tasks.deliveryProgress.delivering'),
              status === 'success' ? t('sign.success') : t('tasks.deliveryProgress.pending'),
            ];
            const detailIsCod = detail.paymentMethod === 'COD';
            const detailPayable = (detail.payableAmount ?? 0) / 100;

            return (
              <>
                {/* L2 配送进度条 */}
                <View className="flex-row items-start px-1 pb-1">
                  {[1, 2, 3].map((n) => {
                    const idx = n as 1 | 2 | 3;
                    const state = dotState(idx);
                    return (
                      <Fragment key={n}>
                        {n > 1 ? (
                          <View className="mx-[-2px] mt-[13px] h-[3px] flex-1 rounded-sm" style={{ backgroundColor: state === 'todo' ? colors.border : colors.success }} />
                        ) : null}
                        <View className="items-center gap-1">
                          <View
                            className={'h-7 w-7 items-center justify-center rounded-full ' + (state === 'todo' ? 'bg-surface-container' : '')}
                            style={
                              state === 'done'
                                ? { backgroundColor: colors.success }
                                : state === 'active'
                                  ? { backgroundColor: colors.primary }
                                  : undefined}
                          >
                            {state === 'done' ? <AppIcon color={colors.surface} name="check" size={14} /> : null}
                          </View>
                          <Text
                            className={'text-[10px] font-semibold ' + (status === 'success' && n === 3 ? 'font-bold' : state === 'active' ? 'font-bold text-primary' : 'text-on-surface-variant')}
                            style={status === 'success' && n === 3 ? { color: colors.success } : undefined}
                          >
                            {progressLabels[n - 1]}
                          </Text>
                        </View>
                      </Fragment>
                    );
                  })}
                </View>

                {/* L1 送达地址卡 + 联系客人入口 */}
                <View className="gap-3 rounded-xl border border-outline/10 bg-surface p-4 shadow-md">
                  <View className="flex-row items-center gap-2">
                    <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: colors.tertiary }}>
                      <AppIcon color={colors.surface} name="dropoff" size={16} />
                    </View>
                    <Text className="flex-1 font-bold leading-tight text-on-surface">{detail.dropoff.title}</Text>
                  </View>
                  <Text className="text-sm text-on-surface-variant">{detail.dropoff.address}</Text>
                  {(detail.dropoff.contactName || detail.dropoff.contactPhone) && (
                    <Text className="text-xs text-on-surface-variant">
                      {detail.dropoff.contactName}
                      {detail.dropoff.contactName && detail.dropoff.contactPhone ? ' · ' : ''}
                      {detail.dropoff.contactPhone ?? ''}
                    </Text>
                  )}
                  {detail.dropoff.contactPhone ? (
                    <Pressable
                      accessibilityLabel={t('sign.callCustomer')}
                      accessibilityRole="button"
                      className="mt-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2"
                      style={{ backgroundColor: colors.success }}
                      onPress={() => void handleCallCustomer()}
                    >
                      <AppIcon color={colors.surface} name="phone" size={14} />
                      <Text className="text-xs font-bold uppercase tracking-wider text-white">{t('sign.contactCustomer')}</Text>
                    </Pressable>
                  ) : null}
                </View>

                {/* L3 备注 note-block（仅 note != null 渲染）。tailwind token bg-warn-bg，非 CSS 变量。
                    原型仅图标/label 用 warn 色，正文是正常深色（P3 修正：原全文橙色可读性差） */}
                {detail.note ? (
                  <View className="gap-1 rounded-lg border border-warn-border bg-warn-bg p-3">
                    <View className="flex-row items-center gap-1.5">
                      <AppIcon color={colors.warning} name="info" size={14} />
                      <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.warning }}>
                        {t('flow.customerNote')}
                      </Text>
                    </View>
                    <Text className="text-sm leading-5 text-on-surface">{detail.note}</Text>
                  </View>
                ) : null}

                {/* L4 COD 卡超市化：应收大字 + 实收输入 + 实时校验提示替代 codHint */}
                {detailIsCod ? (
                  <View className="gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
                    <View className="flex-row items-baseline justify-between">
                      <Text className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('sign.codPayable')}</Text>
                      <Text className="text-2xl font-extrabold text-primary">{formatCurrency(detailPayable, t('common.currency'))}</Text>
                    </View>
                    <Input
                      keyboardType="decimal-pad"
                      label={t('sign.codCollected')}
                      placeholder={t('sign.codCollectedPlaceholder')}
                      value={collectedInput}
                      onChangeText={setCollectedInput}
                    />
                    {codAmountInvalid && collectedInput !== '' ? (
                      <Text className="text-[11px] leading-4 text-error">{t('sign.codAmountInvalid')}</Text>
                    ) : (
                      <Text className="text-[11px] leading-4 text-on-surface-variant opacity-80">{t('sign.codHint')}</Text>
                    )}
                  </View>
                ) : null}

                {/* L5 参考示例（本地图标占位，无外链） */}
                <View className="gap-3">
                  <Text className="px-1 text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('sign.referenceExamples')}</Text>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <EvidenceExample label={t('sign.doorExample')} type="door" />
                    </View>
                    <View className="flex-1">
                      <EvidenceExample label={t('sign.packageExample')} type="package" />
                    </View>
                  </View>
                </View>

                <View className="gap-6 pt-2">
                  <EvidenceUpload
                    actionLabel={t('sign.tapPhoto')}
                    captured={doorCaptured}
                    capturedLabel={t('sign.photoCaptured')}
                    placeholderLabel={t('sign.camPlaceholder')}
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
                    placeholderLabel={t('sign.camPlaceholder')}
                    required
                    title={t('sign.packageImage')}
                    photoUri={packageUri}
                    onPermissionDenied={() => showToast(t('common.cameraPermissionDenied'), 'error')}
                    onError={() => showToast(t('common.cameraError'), 'error')}
                    onPress={(uri) => { setPackageCaptured(true); setPackageUri(uri); }}
                  />
                </View>
              </>
            );
          }}
        </QueryBoundary>
      </ScrollView>

      {/* 底栏：不进 QueryBoundary，loading 时 Button 因 canSubmit=false 禁用 */}
      <View className="absolute bottom-0 left-0 right-0 gap-2 bg-surface px-5 py-4 shadow-lg">
        <Button
          className={status === 'success' ? '' : canSubmit && !codAmountInvalid ? 'bg-primary-container' : 'bg-neutral-muted'}
          disabled={submitDisabled}
          loading={status === 'processing'}
          // T5 §3.4/§7.5: 成功态按钮变绿（审查修复 P1-1：tailwind 无 success key，
          //   经 Button style prop inline 注入——className 拼接无法表达，原实现没传导致仍是红底）
          style={status === 'success' ? { backgroundColor: colors.success } : undefined}
          onPress={() => void handleConfirmDelivery()}
          icon={status === 'success' ? <AppIcon color={colors.surface} name="check" size={16} /> : undefined}
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
