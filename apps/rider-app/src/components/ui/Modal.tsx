import type { ReactNode } from 'react';
import { Modal as NativeModal, Pressable, View } from 'react-native';

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  /** backdrop 关闭面的读屏标签（规则9 零例外：可交互面必须可名状；调用方传已本地化文案，如 cancelLabel） */
  backdropCloseLabel: string;
  /** 遮罩层布局类（居中卡片 / 顶部下拉各有形态，默认居中） */
  backdropClassName?: string;
  /** 内容卡样式类（默认居中白卡） */
  sheetClassName?: string;
  children: ReactNode;
};

/**
 * Modal —— 弹窗基座（R-P1-13 · 走查 20261024，D4=B 渐进拍板）
 * 对齐客户端能力：backdrop 点击关闭 + 对话框 role=alert + 插槽化（标题/内容/动作由调用方自排，
 * 替代原固定「关闭」大按钮——本组件此前 0 消费方，破坏性重构安全）。
 * 内层 sheet 用 Pressable 捕获触摸（native 抢占 responder）+ stopPropagation（web 端 click
 * 冒泡会误触 backdrop 关闭）——收编原 DutyStatusMenu/ConfirmDialog 各自复制的 onPress={()=>null} 阻冒泡。
 * a11y（审查修复 20261025）：backdrop 是关闭动作面 → role=button + 调用方注入 label；
 * 捕获层是触摸守卫非交互面 → 对读屏隐藏，内容语义由内层 role=alert 承载。
 */
export function Modal({
  visible,
  onClose,
  backdropCloseLabel,
  backdropClassName = 'flex-1 items-center justify-center bg-black/40 px-6',
  sheetClassName = 'w-full max-w-md rounded-3xl bg-surface p-6 shadow-lg',
  children,
}: ModalProps) {
  return (
    <NativeModal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable
        accessibilityLabel={backdropCloseLabel}
        accessibilityRole="button"
        className={backdropClassName}
        onPress={onClose}
      >
        <Pressable
          accessibilityElementsHidden
          importantForAccessibility="no"
          className={sheetClassName}
          onPress={(e) => e.stopPropagation()}
        >
          <View accessibilityRole="alert">{children}</View>
        </Pressable>
      </Pressable>
    </NativeModal>
  );
}
