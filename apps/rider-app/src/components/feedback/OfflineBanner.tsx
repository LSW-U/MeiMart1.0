import { Text, View, Pressable } from 'react-native';

import { useNetworkStore } from '../../hooks/useNetworkStore';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useTranslation } from '../../i18n/useTranslation';
import { ConfirmDialog } from './ConfirmDialog';
import { showToast } from './Toast';
import { useState } from 'react';

/**
 * 离线横幅（R-P1-3 升级）：离线时显示待同步条数；存在死信（permanent 立即死信 /
 * 5 轮耗尽）时无论在线与否都显示失败数，并给「重试 / 放弃」两个操作——
 * 骑手必须能看见并处置卡死的失败项，不能只剩静默重试。
 *
 * 数据源：useOfflineQueue（observeCount 订阅 + getDeadCount 死信重算）。
 */
export function OfflineBanner() {
  // P6-5（Q3=B）：切单例 store——与 _layout MainContent 共享同一份网络状态。
  const isOffline = useNetworkStore((s) => s.isOffline);
  const { pendingCount, deadCount, flush, abandonFailed } = useOfflineQueue();
  const { t } = useTranslation();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const offline = isOffline;
  const showDead = deadCount > 0;
  // 无离线且无死信：不渲染
  if (!offline && !showDead) return null;

  const handleRetry = () => {
    void flush()
      .then(({ failed }) => {
        // 全部成功时不再弹（死信归零 Banner 自动收起）；仍有失败保留死信计数
        if (failed > 0) showToast(t('common.syncPartialFailed'), 'error');
      })
      .catch(() => showToast(t('common.syncFailed'), 'error'));
  };

  const handleAbandon = () => {
    setConfirmVisible(false);
    void abandonFailed().then((count) => {
      if (count > 0) showToast(t('common.abandonDone', { count }), 'success');
    });
  };

  return (
    <>
      <View
        className={showDead ? 'bg-error px-4 py-2' : 'bg-primary-container px-4 py-2'}
        accessibilityRole="alert"
        accessibilityLabel={t(
          showDead
            ? 'common.syncDeadCount'
            : offline
              ? 'common.offlinePending'
              : 'common.syncDeadCount',
          { count: showDead ? deadCount : pendingCount },
        )}
      >
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-center text-sm font-semibold ${showDead ? 'text-white' : 'text-white'}`}
          >
            {showDead
              ? t('common.syncDeadCount', { count: deadCount })
              : offline && pendingCount > 0
                ? t('common.offlinePending', { count: pendingCount })
                : t('common.offlineTitle')}
          </Text>
          {/* 死信操作：手动重试 + 放弃（放弃需确认，防误触丢操作记录） */}
          {showDead && (
            <View className="flex-row">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.retry')}
                className="px-3 py-1"
                onPress={handleRetry}
              >
                <Text className="text-sm font-semibold text-white underline">
                  {t('common.retry')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.abandonFailed')}
                className="px-3 py-1"
                onPress={() => setConfirmVisible(true)}
              >
                <Text className="text-sm font-semibold text-white underline">
                  {t('common.abandonFailed')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
        {/* 离线副文案：离线且有队列时提示恢复自动同步（沿用规则 12 语义） */}
        {offline && pendingCount > 0 && (
          <Text className="text-center text-xs text-white/80">{t('common.savedOffline')}</Text>
        )}
      </View>
      <ConfirmDialog
        visible={confirmVisible}
        title={t('common.abandonConfirmTitle')}
        message={t('common.abandonConfirmDesc')}
        okLabel={t('common.abandonConfirmYes')}
        cancelLabel={t('common.cancel')}
        tone="danger"
        onOk={handleAbandon}
        onCancel={() => setConfirmVisible(false)}
      />
    </>
  );
}
