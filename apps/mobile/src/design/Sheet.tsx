/** Bottom sheet built on RN Modal: dimmed backdrop, rounded surface, drag handle. */
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Type } from './typography';
import { useTheme } from './useTheme';

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { t: tr } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Pressable style={[styles.backdrop]} onPress={onClose} accessibilityLabel={tr('ui.close')} />
        <View style={[styles.sheet, { backgroundColor: t.bg, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={[styles.handle, { backgroundColor: t.line }]} />
          {title ? <Text style={[Type.detailTitle, { fontSize: 24, lineHeight: 28, color: t.text }]}>{title}</Text> : null}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(22,24,29,0.35)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, gap: 16 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 6 },
});
