/**
 * 缺货登记弹窗（缺货履约闭环批1 2026-10-24，骑手兜底简化版）
 *
 * 场景：任务详情页 DELIVERING 态（订单 OUT_FOR_DELIVERY），骑手发现商品缺货/损坏
 * 无法完成整单送达时按单登记部分缺货。
 * 端点：POST /rider/orders/:id/out-of-stock；全缺禁报（D12，后端 E-OOS-004），
 * UI 侧文案提示「整单全部缺货只能由仓库登记」。
 *
 * 样式沿用 DepositBlockDialog 绝对定位遮罩先例（仓内无 react-native Modal 使用先例）；
 * 数量输入用 TextInput（pay.tsx 金额输入同款）。
 *
 * P2-2（审查 20261024）补齐任务书明文三项：
 *   - 项选择：任务详情 items 为 string[]（无 item id/quantity，DeliveryTaskView 不透传），
 *     实际落账由后端按「首个未登记项」分配（out-of-stock.service riderReportOutOfStock），
 *     UI 侧展示缺货商品列表供骑手对照确认（不可点选），缺货量登记到首个可登记项。
 *   - 替代建议：同因无 item id，降级为不可选（后端契约字段保留，admin 端可用）。
 *   - 拍照取证：复用 EvidenceUpload 组件（launchCameraAsync + precheckImage('generic')
 *     内建）→ riderUploadApi.taskEvidence 上传 → evidenceUrls（≤3）随 body 提交。
 *
 * maxQty 口径：前端无「本单剩余可登记量」真实数据源（items 无 quantity），保持防呆
 * 上限 9999；数量超限由后端 E-OOS-002 拒 → tasks.oos.qtyError 明示（P3-4 连带修复）。
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { EvidenceUpload } from '../camera/EvidenceUpload';
import { showToast } from '../feedback/Toast';
import { Button } from '../ui';
import { useTranslation, type TranslationKey } from '../../i18n/useTranslation';
import { riderUploadApi } from '../../services/upload';
import { colors } from '../../theme/colors';

/** 骑手段可选缺货原因（与后端 OUT_OF_STOCK_REASONS 对齐） */
const OOS_REASONS = ['DAMAGED', 'EXPIRED', 'MISSING', 'MISLABELED', 'OTHER'] as const;
type OosReason = (typeof OOS_REASONS)[number];

export interface OutOfStockDialogProps {
  visible: boolean;
  /** 本单剩余可登记的最大数量（前端无真实数据源，防呆上限；超限由后端 E-OOS-002 拒） */
  maxQty: number;
  /** 本单商品名列表（任务详情 items，展示供骑手对照；无 item id 不可点选） */
  itemNames?: string[];
  onSubmit: (body: {
    outOfStockQty: number;
    reason: OosReason;
    note?: string;
    evidenceUrls?: string[];
  }) => void;
  submitting: boolean;
  onDismiss: () => void;
}

export function OutOfStockDialog({
  visible,
  maxQty,
  itemNames,
  onSubmit,
  submitting,
  onDismiss,
}: OutOfStockDialogProps) {
  const { t } = useTranslation();
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState<OosReason>('DAMAGED');
  const [note, setNote] = useState('');
  // P2-2：拍照取证（本地 uri 展示 + 上传后 URL 随 body 提交）
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const qtyNum = Number(qty);
  const qtyValid = Number.isInteger(qtyNum) && qtyNum >= 1 && qtyNum <= maxQty;

  async function handlePhoto(uri: string) {
    setPhotoUri(uri);
    setUploading(true);
    try {
      const res = await riderUploadApi.taskEvidence(uri, 'image/jpeg');
      setEvidenceUrl(res.url);
    } catch {
      showToast(t('tasks.oos.photoFailed'), 'error');
      setPhotoUri(null);
      setEvidenceUrl(null);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto() {
    setPhotoUri(null);
    setEvidenceUrl(null);
  }

  if (!visible) return null;

  return (
    // 仓内无 Modal 使用先例，沿用 DepositBlockDialog 绝对定位遮罩 + RN Modal 双保险：
    // Modal 保证覆盖导航栏（任务页底部有 BottomActionBar）
    <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
      <Pressable
        className="flex-1 items-center justify-center bg-black/50 px-8"
        onPress={onDismiss}
      >
        <Pressable className="max-h-[85%] w-full max-w-[340px] gap-3 rounded-3xl bg-surface p-6 shadow-xl">
          <ScrollView contentContainerClassName="gap-3">
            <Text
              accessibilityRole="header"
              className="text-center text-lg font-bold text-on-surface"
            >
              {t('tasks.oos.title')}
            </Text>
            <Text className="text-center text-sm leading-6 text-on-surface-variant">
              {t('tasks.oos.desc')}
            </Text>

            {/* P2-2 项选择（展示态）：items 为 string[] 无 id/quantity，不可点选——
                后端按「首个未登记项」落账，展示列表供骑手对照 */}
            {itemNames && itemNames.length > 0 ? (
              <View className="gap-1">
                <Text className="text-sm font-medium text-on-surface">
                  {t('tasks.oos.itemLabel')}
                </Text>
                <Text className="rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface-variant">
                  {itemNames.join(' · ')}
                </Text>
                <Text className="text-xs text-on-surface-variant">{t('tasks.oos.itemHint')}</Text>
              </View>
            ) : null}

            <Text className="text-sm font-medium text-on-surface">{t('tasks.oos.qtyLabel')}</Text>
            <TextInput
              accessibilityLabel={t('tasks.oos.qtyLabel')}
              className="rounded-lg border border-outline bg-surface px-3 py-2 text-on-surface"
              keyboardType="number-pad"
              value={qty}
              onChangeText={setQty}
              placeholder={`1-${maxQty}`}
              maxLength={String(maxQty).length}
            />

            <Text className="text-sm font-medium text-on-surface">
              {t('tasks.oos.reasonLabel')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {OOS_REASONS.map((r) => (
                <Pressable
                  key={r}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: reason === r }}
                  onPress={() => setReason(r)}
                  className={`rounded-full border px-3 py-1.5 ${
                    reason === r
                      ? 'border-primary bg-primary-container'
                      : 'border-outline bg-surface'
                  }`}
                >
                  <Text
                    className="text-xs"
                    style={{ color: reason === r ? colors.primaryContainer : colors.textMuted }}
                  >
                    {t(`tasks.oos.reason.${r}` as TranslationKey)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-sm font-medium text-on-surface">{t('tasks.oos.noteLabel')}</Text>
            <TextInput
              accessibilityLabel={t('tasks.oos.noteLabel')}
              className="rounded-lg border border-outline bg-surface px-3 py-2 text-on-surface"
              multiline
              value={note}
              onChangeText={setNote}
              maxLength={200}
            />

            {/* P2-2 拍照取证：EvidenceUpload 组件复用（相机权限/预校验/双端内建） */}
            <EvidenceUpload
              title={t('tasks.oos.photoLabel')}
              actionLabel={uploading ? t('tasks.oos.photoUploading') : t('tasks.oos.photoAdd')}
              capturedLabel={uploading ? t('tasks.oos.photoUploading') : t('tasks.oos.photoAdd')}
              captured={photoUri != null && evidenceUrl != null}
              photoUri={photoUri ?? undefined}
              onPress={(uri) => void handlePhoto(uri)}
            />
            {photoUri != null ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tasks.oos.photoRemove')}
                onPress={removePhoto}
                className="self-start"
              >
                <Text className="text-xs" style={{ color: colors.error }}>
                  {t('tasks.oos.photoRemove')}
                </Text>
              </Pressable>
            ) : null}

            <Button
              className="bg-primary-container"
              disabled={!qtyValid || submitting || uploading}
              onPress={() =>
                onSubmit({
                  outOfStockQty: qtyNum,
                  reason,
                  note: note.trim() || undefined,
                  evidenceUrls: evidenceUrl ? [evidenceUrl] : undefined,
                })
              }
            >
              {submitting || uploading ? t('tasks.oos.submitting') : t('tasks.oos.submit')}
            </Button>
            <Button
              className="border border-outline bg-transparent"
              textClassName="text-on-surface"
              onPress={onDismiss}
            >
              {t('common.cancel')}
            </Button>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
