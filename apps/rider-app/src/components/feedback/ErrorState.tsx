import { Text, View } from 'react-native';

import { Button } from '../ui/Button';

type ErrorStateProps = {
  message: string;
  /** B3: 可选标题（默认沿用原英文标题的行为由调用方传 t() 控制）与重试动作 */
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * ErrorState —— 请求失败提示（B3 升级为 QueryBoundary 的 error 态载体，§5 规格）
 * 边框 border-error/40、标题 text-error、重试用 Button、容器 role=alert。
 */
export function ErrorState({ message, title = 'Something went wrong', actionLabel, onAction }: ErrorStateProps) {
  return (
    <View accessibilityRole="alert" className="rounded-2xl border border-error/40 bg-surface p-4" testID="error-state">
      <Text className="text-sm font-extrabold text-error">{title}</Text>
      <Text className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">{message}</Text>
      {actionLabel && onAction ? (
        <Button className="mt-3 h-9 self-start px-3.5" textClassName="text-xs" onPress={onAction}>{actionLabel}</Button>
      ) : null}
    </View>
  );
}
