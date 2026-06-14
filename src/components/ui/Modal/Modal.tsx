import { Modal as RNModal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

import type { ModalProps } from './Modal.types';

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

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
      accessibilityLabel={title ?? 'Dialog'}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => dismissable && onClose?.()}
        accessibilityRole="button"
        accessibilityLabel="Close dialog"
        accessibilityHint="Tap outside to close"
      >
        <Pressable
          style={[styles.dialog, { backgroundColor: colors['surface-container-lowest'] }]}
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="alert"
          accessibilityLabel={title ?? 'Dialog content'}
        >
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
                  accessibilityLabel="Close"
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
        </Pressable>
      </Pressable>
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
