import { Modal as NativeModal, Pressable, Text, View } from 'react-native';

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

export function ConfirmDialog({ visible, title, message, okLabel, cancelLabel, tone = 'default', onOk, onCancel }: ConfirmDialogProps) {
  // danger 走 error token（原 bg-primary-container 与品牌主按钮色混淆）
  const okBg = tone === 'danger' ? 'bg-error' : 'bg-primary';

  return (
    <NativeModal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={onCancel}>
        <Pressable className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-lg" onPress={() => null}>
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
                <Text className="text-center text-base font-semibold text-on-surface-variant">{cancelLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel={okLabel} className={`flex-1 rounded-full ${okBg} py-3`} onPress={onOk}>
              <Text className="text-center text-base font-semibold text-white">{okLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </NativeModal>
  );
}
