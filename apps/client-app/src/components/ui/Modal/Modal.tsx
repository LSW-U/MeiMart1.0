import { Modal as RNModal, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import type { ViewProps } from 'react-native';
import type { ComponentType } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';

import type { ModalProps } from './Modal.types';

// Why: Web 端 Pressable 渲染 <button>，button 不能嵌套 button（backdrop > dialog > close 三层 Pressable
// 嵌套 → Web console "button cannot contain nested button"）。Web 用 View（div）+ onClick target
// 检查替代 backdrop Pressable；native 保持 Pressable 嵌套（不报 + stopPropagation 防误关）。
const isWeb = Platform.OS === 'web';

// Web backdrop：View cast 接受 onClick（Web div 运行时支持 onClick；TS ViewProps 不含，需 cast）
// 原因：规则36 禁 as any/as unknown as，用 ComponentType<ViewProps & {onClick}> 类型扩展替代
type BackdropClick = { onClick?: (e: { target: unknown; currentTarget: unknown }) => void };
const WebBackdrop = View as ComponentType<ViewProps & BackdropClick>;

export function Modal({
  visible,
  onClose,
  title,
  footer,
  dismissable = true,
  children,
  testID,
}: ModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // inner 内容（header + close + body + footer），Web/native 共用，避免两套分支重复
  const inner = (
    <>
      {title && (
        <View style={[styles.header, { borderBottomColor: colors['outline-variant'] }]}>
          <Text
            style={[styles.title, { color: colors['on-surface'] }]}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {onClose && (
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={styles.closeBtn}
            >
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={colors['on-surface-variant']}
              />
            </Pressable>
          )}
        </View>
      )}
      <View style={styles.body}>{children}</View>
      {footer && (
        <View style={[styles.footer, { borderTopColor: colors['outline-variant'] }]}>
          {footer}
        </View>
      )}
    </>
  );

  const dialogStyle = [styles.dialog, { backgroundColor: colors['surface-container-lowest'] }];

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
      accessibilityLabel={title ?? 'Dialog'}
    >
      {isWeb ? (
        // Web：backdrop View（div）+ onClick target 检查（仅点 backdrop 空白关闭，点 dialog 不关闭）。
        // dialog View（div）可含 close Pressable（button）+ body 子 Pressable，不嵌套 button。
        <WebBackdrop
          style={styles.backdrop}
          onClick={(e) => {
            if (dismissable && e.target === e.currentTarget) onClose?.();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('common.closeDialog')}
          accessibilityHint="Tap outside to close"
        >
          <View style={dialogStyle} accessibilityRole="alert" accessibilityLabel={title ?? 'Dialog content'}>
            {inner}
          </View>
        </WebBackdrop>
      ) : (
        // native：backdrop Pressable 点击关闭 + dialog Pressable stopPropagation 防点 dialog 误关（native 不报 button 嵌套）
        <Pressable
          style={styles.backdrop}
          onPress={() => dismissable && onClose?.()}
          accessibilityRole="button"
          accessibilityLabel={t('common.closeDialog')}
          accessibilityHint="Tap outside to close"
        >
          <Pressable
            style={dialogStyle}
            onPress={(e) => e.stopPropagation()}
            accessibilityRole="alert"
            accessibilityLabel={title ?? 'Dialog content'}
          >
            {inner}
          </Pressable>
        </Pressable>
      )}
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
