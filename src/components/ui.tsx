import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useRouter } from 'expo-router';
import { C, F, R, S } from '@/theme';

/*
 * Barrel các primitive nhỏ, cố ý đặt lowercase để phân biệt với file-một-component (folder §3).
 * Primitive mới vào đây; tách ra file PascalCase riêng khi cần state/animation đáng kể hoặc >60 dòng.
 */

/** Nút chính. `loading` khoá nút và thay nhãn bằng spinner — màn hình không tự dựng cờ riêng. */
export function PinButton({
  label,
  onPress,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.pin,
        inactive && styles.pinInactive,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.pinLabel}>{label}</Text>}
    </Pressable>
  );
}

/** Nút phụ, nền trong. */
export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.ghost, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  );
}

/** Ô nhập có nhãn. Kế thừa toàn bộ `TextInputProps` thay vì chép lại field (typescript §3). */
export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={C.muted} style={[styles.fieldInput, style]} {...props} />
    </View>
  );
}

/** Tiêu đề màn có nút quay lại; fallback về bảng tin vì route có thể mở thẳng bằng deep link. */
export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={back}
        hitSlop={12}
      >
        <Text style={styles.headerBack}>‹</Text>
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={C.brandTx} />
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    backgroundColor: C.brand,
    borderRadius: R.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  pinInactive: { backgroundColor: C.line },
  pinLabel: { color: '#fff', fontFamily: F.uiBold, fontSize: 15 },
  ghost: { paddingVertical: 12, alignItems: 'center' },
  ghostLabel: { color: C.brandTx, fontFamily: F.uiSemi, fontSize: 14 },
  field: { gap: S.xs },
  fieldLabel: { fontFamily: F.uiSemi, fontSize: 12, color: C.inkSoft },
  fieldInput: {
    backgroundColor: C.sand,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.sm,
    paddingHorizontal: S.md,
    paddingVertical: 12,
    fontFamily: F.ui,
    fontSize: 15,
    color: C.ink,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: S.sm },
  headerBack: { fontFamily: F.uiBold, fontSize: 28, lineHeight: 30, color: C.ink },
  headerTitle: { fontFamily: F.uiBlack, fontSize: 20, color: C.ink },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xl, gap: S.sm },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontFamily: F.ui, fontSize: 14, color: C.inkSoft, textAlign: 'center' },
});
