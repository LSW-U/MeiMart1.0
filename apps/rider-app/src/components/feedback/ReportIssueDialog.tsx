/**
 * 上报异常弹窗（已取消订单出口 F3 / 超时返仓 §4，20261117 立项）
 *
 * 场景一（F3）：任务进行中但关联订单已被取消（orderStatus==='CANCELLED'），
 *   卡片「上报异常」入口 → reason 固定 ORDER_CANCELLED（可选备注+拍照）。
 * 场景二（§4）：普通单超时后「开始返仓」→ reason 固定 DEADLINE_OVERDUE_RETURN，
 *   备注必填（拍板：超时返仓必须说明情况）。
 *
 * 端点：POST /rider/tasks/:id/report-issue；离线时由 useReportIssue 入队
 * （sync.ts 'reportIssue' case），重放 200 由后端 B4 幂等保证。
 *
 * 结构复用 OutOfStockDialog（批C ui/Modal 基座 + reason radio chips +
 * EvidenceUpload），差异：无数量输入；reason 由调用方圈定子集；
 * noteRequired 时提交前校验（tasks.issue.noteRequired toast）。
 */
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { EvidenceUpload } from '../camera/EvidenceUpload';
import { showToast } from '../feedback/Toast';
import { Button, formBackdropClass, Modal } from '../ui';
import { useTranslation, type TranslationKey } from '../../i18n/useTranslation';
import { riderUploadApi } from '../../services/upload';
import type { ReportIssueReason } from '../../types/task';
import { colors } from '../../theme/colors';

export interface ReportIssueDialogProps {
  visible: boolean;
  /** 可选原因子集（F3 传 ['ORDER_CANCELLED']；§4 传 ['DEADLINE_OVERDUE_RETURN']） */
  reasons: readonly ReportIssueReason[];
  /** §4 拍板：超时返仓备注必填（空 → toast 拦下） */
  noteRequired?: boolean;
  onSubmit: (body: { reason: ReportIssueReason; note?: string; evidenceUrls?: string[] }) => void;
  submitting: boolean;
  onDismiss: () => void;
}

export function ReportIssueDialog({
  visible,
  reasons,
  noteRequired = false,
  onSubmit,
  submitting,
  onDismiss,
}: ReportIssueDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportIssueReason>(reasons[0]);
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // 审查 🟡1：dialog 常驻挂载（visible 切换不卸载 children），reason/note/photo 是跨开
  // 残留 state——上开超时单选中 DEADLINE_OVERDUE_RETURN 后再开取消单，选中态与
  // reasons[0] 不一致，UI 无选中却带旧 reason 提交。不用 useEffect 重置（react-hooks
  // set-state-in-effect 禁），用 React 官方「props 变化时渲染期调整 state」模式：
  // visible false→true 跳变时同步重置回初值（每次打开恰好触发一次）。
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setReason(reasons[0]);
      setNote('');
      setPhotoUri(null);
      setEvidenceUrl(null);
    }
  }

  async function handlePhoto(uri: string) {
    setPhotoUri(uri);
    setUploading(true);
    try {
      const res = await riderUploadApi.taskEvidence(uri, 'image/jpeg');
      setEvidenceUrl(res.url);
    } catch {
      showToast(t('tasks.issue.photoFailed'), 'error');
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

  function handleSubmit() {
    const trimmed = note.trim();
    if (noteRequired && !trimmed) {
      showToast(t('tasks.issue.noteRequired'), 'error');
      return;
    }
    onSubmit({
      reason,
      note: trimmed || undefined,
      evidenceUrls: evidenceUrl ? [evidenceUrl] : undefined,
    });
  }

  return (
    // 同 OutOfStockDialog 批C：ui/Modal 基座，视觉参数与卡宽对齐（400px）
    <Modal
      backdropClassName={formBackdropClass}
      backdropCloseLabel={t('common.cancel')}
      sheetClassName="max-h-[85%] w-full max-w-[400px] rounded-3xl bg-surface p-6 shadow-xl"
      visible={visible}
      onClose={onDismiss}
    >
      <ScrollView contentContainerClassName="gap-3">
        <Text accessibilityRole="header" className="text-center text-lg font-bold text-on-surface">
          {t('tasks.issue.title')}
        </Text>
        <Text className="text-center text-sm leading-6 text-on-surface-variant">
          {t('tasks.issue.desc')}
        </Text>

        <Text className="text-sm font-medium text-on-surface">{t('tasks.issue.reasonLabel')}</Text>
        <View
          accessibilityLabel={t('tasks.issue.reasonLabel')}
          accessibilityRole="radiogroup"
          className="flex-row flex-wrap gap-2"
        >
          {reasons.map((r) => (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ selected: reason === r }}
              onPress={() => setReason(r)}
              className={`rounded-full border px-3 py-1.5 ${
                reason === r ? 'border-primary bg-primary-container' : 'border-outline bg-surface'
              }`}
            >
              <Text
                className="text-xs"
                style={{ color: reason === r ? colors.primaryContainer : colors.textMuted }}
              >
                {t(`tasks.issue.reason.${r}` as TranslationKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-sm font-medium text-on-surface">
          {noteRequired ? t('tasks.issue.noteLabel') : t('tasks.issue.noteOptional')}
        </Text>
        <TextInput
          accessibilityLabel={t('tasks.issue.noteLabel')}
          className="rounded-lg border border-outline bg-surface px-3 py-2 text-on-surface"
          multiline
          value={note}
          onChangeText={setNote}
          maxLength={200}
        />

        <EvidenceUpload
          title={t('tasks.issue.photoLabel')}
          actionLabel={uploading ? t('tasks.issue.photoUploading') : t('tasks.issue.photoAdd')}
          capturedLabel={uploading ? t('tasks.issue.photoUploading') : t('tasks.issue.photoAdd')}
          captured={photoUri != null && evidenceUrl != null}
          photoUri={photoUri ?? undefined}
          onPress={(uri) => void handlePhoto(uri)}
        />
        {photoUri != null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tasks.issue.photoRemove')}
            onPress={removePhoto}
            className="self-start"
          >
            <Text className="text-xs" style={{ color: colors.error }}>
              {t('tasks.issue.photoRemove')}
            </Text>
          </Pressable>
        ) : null}

        <Button
          className="bg-primary-container"
          disabled={submitting || uploading}
          onPress={handleSubmit}
        >
          {submitting || uploading ? t('tasks.issue.submitting') : t('tasks.issue.submit')}
        </Button>
        <Button variant="outline" onPress={onDismiss}>
          {t('common.cancel')}
        </Button>
      </ScrollView>
    </Modal>
  );
}
