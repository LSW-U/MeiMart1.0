import type { ReactNode } from 'react';
import { Animated, PanResponder, Text, View, type LayoutChangeEvent } from 'react-native';

type SwipeButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
};

export function SwipeButton({ children, disabled = false, onPress }: SwipeButtonProps) {
  const translateX = new Animated.Value(0);
  const containerWidth = { value: 0 };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderMove: (_, gs) => {
      const max = containerWidth.value - 56;
      const x = Math.max(0, Math.min(gs.dx, max));
      translateX.setValue(x);
    },
    onPanResponderRelease: (_, gs) => {
      const max = containerWidth.value - 56;
      if (gs.dx > max * 0.7) {
        Animated.spring(translateX, { toValue: max, useNativeDriver: true }).start(() => onPress?.());
        setTimeout(() => Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start(), 300);
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  const onLayout = (e: LayoutChangeEvent) => {
    containerWidth.value = e.nativeEvent.layout.width;
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
