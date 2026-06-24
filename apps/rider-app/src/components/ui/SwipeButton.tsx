/* eslint-disable react-hooks/refs -- 原因：PanResponder.create 的 touch 回调与 onLayout 事件回调中读写 containerWidthRef.current 是合法用法，规则静态分析误判为 render 期间读 ref */
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Animated, PanResponder, Text, View, type LayoutChangeEvent } from 'react-native';

type SwipeButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
};

export function SwipeButton({ children, disabled = false, onPress }: SwipeButtonProps) {
  // translateX 用 useState 惰性初始化，保证 mount 时创建一次且不在 render 期间读 ref
  const [translateX] = useState(() => new Animated.Value(0));
  // containerWidth 不需要触发 re-render，用 ref 在 onLayout 事件回调中读写
  const containerWidthRef = useRef(0);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderMove: (_, gs) => {
      const max = containerWidthRef.current - 56;
      const x = Math.max(0, Math.min(gs.dx, max));
      translateX.setValue(x);
    },
    onPanResponderRelease: (_, gs) => {
      const max = containerWidthRef.current - 56;
      if (gs.dx > max * 0.7) {
        Animated.spring(translateX, { toValue: max, useNativeDriver: true }).start(() => onPress?.());
        setTimeout(() => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(), 300);
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  const onLayout = (e: LayoutChangeEvent) => {
    containerWidthRef.current = e.nativeEvent.layout.width;
  };

  return (
    <View
      onLayout={onLayout}
      className={`relative h-14 w-full flex-row items-center overflow-hidden rounded-lg ${disabled ? 'bg-[#5d5f5f] opacity-50' : 'bg-[#961813]'}`}
    >
      <View className="absolute left-0 right-0 items-center justify-center">
        <Text className="text-sm font-bold uppercase tracking-widest text-white/80">{children}</Text>
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
        className="z-10 h-12 w-14 items-center justify-center rounded-lg bg-white/25"
      >
        <Text className="text-xl text-white">→</Text>
      </Animated.View>
    </View>
  );
}
