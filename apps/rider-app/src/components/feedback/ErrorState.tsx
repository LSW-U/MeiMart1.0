import { Text, View } from 'react-native';

type ErrorStateProps = {
  message: string;
  /** B3: 可选标题（默认沿用原英文标题的行为由调用方传 t() 控制）与重试动作 */
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorState({ message, title = 'Something went wrong', actionLabel, onAction }: ErrorStateProps) {
  return (
    <View accessibilityRole="alert" className="rounded-3xl border border-surface-variant bg-surface p-5">
      <Text className="font-bold text-primary-container">{title}</Text>
      <Text className="mt-2 text-sm text-on-surface-variant">{message}</Text>
      {actionLabel && onAction ? <Text className="mt-3 text-sm font-bold text-primary" onPress={onAction}>{actionLabel}</Text> : null}
    </View>
  );
}
