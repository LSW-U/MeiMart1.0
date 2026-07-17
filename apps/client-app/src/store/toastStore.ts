// Toast store — 全局轻量提示
// Why: Alert.alert 在 Web 端不显示，用 Toast 替代
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, type?: ToastType, duration?: number) => void;
  hide: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = 'info', duration = 2500) => {
    const id = ++nextId;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },
  hide: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Why: 提供 imperative API，可在非组件代码中调用
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'success', duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'error', duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().show(message, 'info', duration),
};
