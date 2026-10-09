import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { C, F, R, S } from '@/theme';

/**
 * Ô nhập có nhãn, viền xanh khi đang gõ (thiết kế đánh dấu ô đang focus). Kế thừa toàn bộ
 * `TextInputProps` thay vì chép lại field (typescript §3). `hint` là chữ nhỏ góc phải dưới — đếm ký tự.
 */
export function Field({
  label,
  hint,
  style,
  onFocus,
  onBlur,
  multiline,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={C.muted}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, focused && styles.focused, style]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {hint !== undefined && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: S.sm },
  label: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.lineStrong,
    backgroundColor: C.paperWarm,
    fontFamily: F.ui,
    fontSize: 15,
    color: C.ink,
  },
  multiline: { minHeight: 104, paddingTop: S.md, lineHeight: 21, textAlignVertical: 'top' },
  // Viền dày hơn 0.5 khi focus; bù bằng padding để chữ không nhảy.
  focused: { borderWidth: 1.5, borderColor: C.brandBright, paddingHorizontal: 13.5 },
  hint: { alignSelf: 'flex-end', fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
});
