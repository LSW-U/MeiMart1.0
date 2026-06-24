import { useEffect, useReducer, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

type ToastItem = {
  id: number;
  message: string;
  type?: 'info' | 'success' | 'error';
  duration?: number;
};

type Action =
  | { type: 'add'; item: ToastItem }
  | { type: 'remove'; id: number };

let nextId = 0;
const listeners: ((item: ToastItem) => void)[] = [];

export function showToast(message: string, type: ToastItem['type'] = 'info', duration = 3000) {
  const item: ToastItem = { id: nextId++, message, type, duration };
  listeners.forEach((fn) => fn(item));
}

function ToastEntry({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  // opacity 用 useState 惰性初始化，保证 mount 时创建一次且不在 render 期间读 ref
  const [opacity] = useState(() => new Animated.Value(0));
  // 保存最新 onDone 到 ref，避免 effect 每次父 render 重置动画定时器
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDoneRef.current());
    }, item.duration ?? 3000);
    return () => clearTimeout(timer);
  }, [item.duration, opacity]);

  const bgColor = item.type === 'success' ? 'bg-[#2d6a2e]' : item.type === 'error' ? 'bg-[#961813]' : 'bg-[#261816]';

  return (
    <Animated.View style={{ opacity }} className="w-full items-center px-5">
      <Pressable className={`w-full rounded-xl ${bgColor} px-4 py-3 shadow-lg`} onPress={onDone}>
        <Text className="text-center text-sm font-semibold text-white">{item.message}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function ToastHost() {
  const [queue, dispatch] = useReducer((state: ToastItem[], action: Action) => {
    if (action.type === 'add') return [...state, action.item];
    if (action.type === 'remove') return state.filter((t) => t.id !== action.id);
    return state;
  }, []);

  useEffect(() => {
    const handler = (item: ToastItem) => dispatch({ type: 'add', item });
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  if (queue.length === 0) return null;

  return (
    <View className="absolute top-14 left-0 right-0 z-50 gap-2">
      {queue.map((item) => (
        <ToastEntry key={item.id} item={item} onDone={() => dispatch({ type: 'remove', id: item.id })} />
      ))}
    </View>
  );
}
