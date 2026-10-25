import { Pressable, Text, View } from 'react-native';

import { Modal } from '../ui/Modal';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  okLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  onOk: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  okLabel,
  cancelLabel,
  tone = 'default',
  onOk,
  onCancel,
}: ConfirmDialogProps) {
  // danger 走 error token（原 bg-primary-container 与品牌主按钮色混淆）
  const okBg = tone === 'danger' ? 'bg-error' : 'bg-primary';

  // R-P1-13（走查 20261024 · D4=B）：弹窗基座收编——居中卡片即 Modal 默认形态，
  // backdrop 关闭/alert 语义/阻冒泡进基座，本组件只留标题/正文/动作行
  // backdrop 读屏标签走 props 注入（纯展示组件不 import i18n）：backdrop 关闭=取消语义
  return (
    <Modal backdropCloseLabel={cancelLabel ?? okLabel} visible={visible} onClose={onCancel}>
      <Text className="text-lg font-bold text-on-surface">{title}</Text>
      <Text className="mt-3 text-sm leading-6 text-on-surface-variant">{message}</Text>
      <View className="mt-6 flex-row gap-3">
        {cancelLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            className="flex-1 rounded-full border border-outline-variant bg-surface py-3"
            onPress={onCancel}
          >
            <Text className="text-center text-base font-semibold text-on-surface-variant">
              {cancelLabel}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={okLabel}
          className={`flex-1 rounded-full ${okBg} py-3`}
          onPress={onOk}
        >
          <Text className="text-center text-base font-semibold text-white">{okLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
