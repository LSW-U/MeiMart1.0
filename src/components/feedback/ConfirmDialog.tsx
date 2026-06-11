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
  const okBg = tone === 'danger' ? 'bg-[#961813]' : 'bg-[#720003]';

  return (
    <NativeModal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={onCancel}>
        <Pressable className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg" onPress={() => null}>
          <Text className="text-lg font-bold text-[#261816]">{title}</Text>
          <Text className="mt-3 text-sm leading-6 text-[#59413d]">{message}</Text>
          <View className="mt-6 flex-row gap-3">
            {cancelLabel ? (
              <Pressable className="flex-1 rounded-full border border-[#e1bfba] bg-white py-3" onPress={onCancel}>
                <Text className="text-center text-base font-semibold text-[#59413d]">{cancelLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable className={`flex-1 rounded-full ${okBg} py-3`} onPress={onOk}>
              <Text className="text-center text-base font-semibold text-white">{okLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </NativeModal>
  );
}
