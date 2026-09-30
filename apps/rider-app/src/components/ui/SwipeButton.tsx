import type { ReactNode } from 'react';
import { useRef } from 'react';
import { Pressable, Text } from 'react-native';

type SwipeButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  /** 返回 Promise（调用方 async 函数）；resolve/reject 后才释放幂等锁 */
  onPress?: () => void | Promise<void>;
};

// 原实现用 PanResponder 滑动，但 RN Web 端 responder system 转译不完美导致无法滑动。
// 改为 Pressable 点击按钮（Web + native 一致行为），UI 保留长条 + → 箭头视觉。
export function SwipeButton({ children, disabled = false, onPress }: SwipeButtonProps) {
  // C15（P2-2 修复）：本地幂等锁——await onPress 返回的 Promise，settle 后才释放。
  // 原实现 finally 同步释放使锁窗口≈0（两次物理 tap 是两次独立事件派发，第二次
  // 到达时 ref 已复位，去重形同虚设）。现调用方传 async 函数（RQ mutateAsync 自带
  // pending 至 settle 的生命周期），in-flight 期间再次点击直接吞掉；同步返回值的
  // 调用方行为不变（锁立即释放，靠 disabled 兜底）。
  const firingRef = useRef(false);

  const handlePress = () => {
    if (firingRef.current) return;
    firingRef.current = true;
    const result = onPress?.();
    const settled = result instanceof Promise ? result : Promise.resolve();
    settled.finally(() => {
      firingRef.current = false;
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      disabled={disabled}
      onPress={handlePress}
      className={`h-14 w-full flex-row items-center justify-center rounded-lg ${disabled ? 'bg-primary-container opacity-50' : 'bg-primary-container'}`}
    >
      <Text className="text-base font-bold uppercase tracking-widest text-white">{children}</Text>
      <Text className="ml-2 text-xl text-white/80">→</Text>
    </Pressable>
  );
}
