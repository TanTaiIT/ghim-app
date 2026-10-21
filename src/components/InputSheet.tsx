import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarButton, type BarTone } from './ActionBar';
import { Field } from './Field';
import { C, F, R, S } from '@/theme';

/**
 * Bảng hỏi một dòng chữ trước một thao tác: lý do khoá, lý do từ chối giấy tờ, ghi chú bác việc nhóm chuyển lên, tên
 * danh mục. Mỗi lần mở, ô nhập bắt đầu lại từ `initial`: nội dung bảng unmount khi đóng, chữ gõ dở của lượt trước
 * không dính sang việc khác.
 */
export function InputSheet({
  visible,
  title,
  note,
  label,
  placeholder,
  initial = '',
  confirmLabel,
  tone = 'primary',
  minLength = 1,
  multiline = false,
  busy = false,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  title: string;
  note?: string;
  label: string;
  placeholder?: string;
  initial?: string;
  confirmLabel: string;
  tone?: BarTone;
  minLength?: number;
  multiline?: boolean;
  busy?: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
          <View style={styles.grip} />
          <Text style={styles.title}>{title}</Text>
          {note && <Text style={styles.text}>{note}</Text>}
          {visible && (
            <SheetForm
              label={label}
              placeholder={placeholder}
              initial={initial}
              confirmLabel={confirmLabel}
              tone={tone}
              minLength={minLength}
              multiline={multiline}
              busy={busy}
              onSubmit={onSubmit}
              onClose={onClose}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Tách ra để state ô nhập sống theo lần mở bảng, không theo vòng đời màn hình. */
function SheetForm({
  label,
  placeholder,
  initial,
  confirmLabel,
  tone,
  minLength,
  multiline,
  busy,
  onSubmit,
  onClose,
}: {
  label: string;
  placeholder: string | undefined;
  initial: string;
  confirmLabel: string;
  tone: BarTone;
  minLength: number;
  multiline: boolean;
  busy: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initial);
  const trimmed = text.trim();
  return (
    <>
      <Field
        label={label}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        multiline={multiline}
        autoFocus
      />
      <View style={styles.row}>
        <BarButton label="Huỷ" tone="ghost" onPress={onClose} />
        <BarButton
          label={confirmLabel}
          tone={tone}
          loading={busy}
          disabled={trimmed.length < minLength}
          onPress={() => onSubmit(trimmed)}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.scrim },
  sheet: {
    backgroundColor: C.paperWarm,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S.sm,
    paddingHorizontal: S.lg,
    gap: S.md,
  },
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.lineStrong,
  },
  title: { fontFamily: F.uiBold, fontSize: 17, color: C.ink, paddingTop: S.sm },
  text: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  row: { flexDirection: 'row', gap: 10 },
});
