import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconName } from './ui';
import { C, F, R, S, shadowLift } from '@/theme';

/*
 * Thanh nút dính đáy màn và nút của nó. Khác `PinButton`: có tông "nguy hiểm" cho Gỡ tin / Khoá tài khoản, và đứng cạnh
 * nhau chia đều chiều ngang — quyết định trên bàn vận hành luôn là chọn một trong vài nút ngang hàng.
 */

const TONES = {
  primary: { bg: C.brand, fg: C.paperWarm, line: C.brand },
  danger: { bg: C.pin, fg: C.paperWarm, line: C.pin },
  dangerSoft: { bg: C.pinLight, fg: C.pin, line: C.pinLight },
  ghost: { bg: C.sand, fg: C.ink, line: C.sand },
} as const;

export type BarTone = keyof typeof TONES;

export function BarButton({
  label,
  onPress,
  tone = 'primary',
  icon,
  disabled = false,
  loading = false,
  compact = false,
  fit = false,
}: {
  label: string;
  onPress: () => void;
  tone?: BarTone;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Nút trong thẻ (hàng chờ): thấp hơn nút của thanh đáy. */
  compact?: boolean;
  /** Rộng theo chữ thay vì chia đều hàng — nút đứng cạnh một đoạn chữ dài (lý do mẫu). */
  fit?: boolean;
}) {
  const t = TONES[tone];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      // Cùng lý do với PinButton: thiếu nhãn rõ thì Android giữ mô tả "busy" sau lượt loading.
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        fit && styles.fit,
        { backgroundColor: t.bg, borderColor: t.line },
        inactive && styles.inactive,
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={t.fg} />
      ) : (
        <>
          {icon && <Feather name={icon} size={compact ? 16 : 18} color={t.fg} />}
          <Text
            style={[styles.label, compact && styles.labelCompact, { color: t.fg }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Hàng nút chia đều; `note` thay cả hàng khi không có quyết định nào cho người này (việc đang có người giữ…). */
export function ActionBar({ children, note }: { children?: ReactNode; note?: string | null }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, S.md) }]}>
      {note ? <Text style={styles.note}>{note}</Text> : <View style={styles.row}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: S.md,
    paddingHorizontal: S.lg,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.paperWarm,
    ...shadowLift,
  },
  row: { flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    flexDirection: 'row',
    gap: S.sm,
    height: 52,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { height: 44, borderRadius: R.sm },
  fit: { flex: 0, paddingHorizontal: S.lg },
  inactive: { opacity: 0.45 },
  label: { fontFamily: F.uiBold, fontSize: 15 },
  labelCompact: { fontSize: 14 },
  note: {
    paddingVertical: S.sm,
    fontFamily: F.uiMedium,
    fontSize: 13,
    lineHeight: 19,
    color: C.inkSoft,
    textAlign: 'center',
  },
});
