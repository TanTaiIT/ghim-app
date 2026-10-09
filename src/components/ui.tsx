import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { C, F, R, S, shadow } from '@/theme';
import { formatVnd } from '@/utils/format';

/*
 * Barrel các primitive nhỏ, cố ý đặt lowercase để phân biệt với file-một-component (folder §3).
 * Primitive mới vào đây; tách ra file PascalCase riêng khi cần state/animation đáng kể hoặc >60 dòng.
 * Kích thước theo màn "Hệ thống thiết kế" của bộ UI: vùng chạm tối thiểu 44, icon nét 2px cỡ 20–24.
 */

export type IconName = ComponentProps<typeof Feather>['name'];

/** Quay lại; route mở thẳng bằng deep link không có gì phía sau nên rơi về bảng tin. */
export function useBack() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'));
}

/**
 * Nút chính. `loading` khoá nút và thay nhãn bằng spinner — màn hình không tự dựng cờ riêng.
 * `compact` cho nút nằm trong thẻ, cạnh `OutlineButton compact`.
 */
export function PinButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  compact = false,
  icon,
  iconRight = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  icon?: IconName;
  iconRight?: boolean;
}) {
  const inactive = disabled || loading;
  const glyph = icon ? <Feather name={icon} size={20} color={C.paperWarm} /> : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.pin,
        compact && styles.pinCompact,
        inactive && styles.inactive,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={C.paperWarm} />
      ) : (
        <>
          {!iconRight && glyph}
          <Text style={[styles.pinLabel, compact && styles.labelSmall]}>{label}</Text>
          {iconRight && glyph}
        </>
      )}
    </Pressable>
  );
}

/** Nút viền thương hiệu. `compact` cho nút trong thẻ (Xem trang, Đã giải quyết). */
export function OutlineButton({
  label,
  onPress,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.outline,
        compact && styles.outlineCompact,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.outlineLabel, compact && styles.labelSmall]}>{label}</Text>
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

/**
 * Nút chỉ có icon, vùng chạm 44. `float` = tròn trắng có bóng (trên ảnh), `glass` = kính mờ (trên nền
 * tối), `outline` = viền mảnh (trên thẻ trắng).
 */
export function IconButton({
  icon,
  label,
  onPress,
  variant = 'plain',
  color,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: 'plain' | 'float' | 'glass' | 'outline';
  color?: string;
}) {
  const tint = color ?? (variant === 'glass' ? C.paperWarm : C.ink);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconBtn,
        ICON_VARIANT[variant],
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Feather name={icon} size={variant === 'plain' ? 22 : 20} color={tint} />
    </Pressable>
  );
}

const TAG = {
  brand: { bg: C.brandLt, fg: C.brandDark },
  boost: { bg: C.boost, fg: C.boostTx },
  neutral: { bg: C.sand, fg: C.inkMid },
  amber: { bg: C.amberLight, fg: C.boostTx },
} as const;

/** Nhãn nhỏ: "Nổi bật", "Như mới", trạng thái tin. */
export function Tag({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: keyof typeof TAG;
  icon?: IconName;
}) {
  const t = TAG[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      {icon && <Feather name={icon} size={11} color={t.fg} />}
      <Text style={[styles.tagLabel, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/** Giá luôn ExtraBold, cam đậm, chữ số đều cột. */
export function Price({ value, size = 15 }: { value: number; size?: number }) {
  return <Text style={[styles.price, { fontSize: size }]}>{formatVnd(value)}</Text>;
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction && (
        <Pressable accessibilityRole="link" onPress={onAction} hitSlop={12}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Khối cảnh báo an toàn giao dịch (chi tiết tin, chat). */
export function SafetyNote({ title, text }: { title?: string; text: string }) {
  return (
    <View style={[styles.safety, !title && styles.safetyCompact]}>
      <Feather name="shield" size={title ? 22 : 16} color={C.price} />
      <View style={styles.safetyBody}>
        {title && <Text style={styles.safetyTitle}>{title}</Text>}
        <Text style={[styles.safetyText, !title && styles.safetyTextSmall]}>{text}</Text>
      </View>
    </View>
  );
}

/** Thanh tiêu đề màn con: nút quay lại, tiêu đề giữa, chỗ cho nút bên phải. */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const back = useBack();
  return (
    <View style={styles.header}>
      <IconButton icon="chevron-left" label="Quay lại" onPress={back} />
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerSide}>{right}</View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  text,
}: {
  icon: IconName;
  title?: string;
  text: string;
}) {
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={40} color={C.faint} />
      {title && <Text style={styles.emptyTitle}>{title}</Text>}
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
    flexDirection: 'row',
    gap: S.sm,
    backgroundColor: C.brand,
    borderRadius: R.md,
    height: 54,
    paddingHorizontal: S.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCompact: { height: 36, borderRadius: R.sm, paddingHorizontal: S.md },
  inactive: { opacity: 0.45 },
  pinLabel: { color: C.paperWarm, fontFamily: F.uiBold, fontSize: 16 },
  outline: {
    height: 52,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.brand,
    paddingHorizontal: S.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineCompact: { height: 36, borderRadius: R.sm, paddingHorizontal: S.md },
  outlineLabel: { color: C.brandTx, fontFamily: F.uiBold, fontSize: 15 },
  labelSmall: { fontSize: 13 },
  ghost: { paddingVertical: 12, alignItems: 'center' },
  ghostLabel: { color: C.brandTx, fontFamily: F.uiSemi, fontSize: 14 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 22,
    paddingHorizontal: S.sm,
    borderRadius: R.full,
  },
  tagLabel: { fontFamily: F.uiBold, fontSize: 11 },
  price: {
    fontFamily: F.uiBlack,
    color: C.price,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.15,
  },
  section: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: F.uiBold, fontSize: 18, color: C.ink },
  sectionAction: { fontFamily: F.uiSemi, fontSize: 13, color: C.brandTx },
  safety: {
    flexDirection: 'row',
    gap: S.md,
    padding: 14,
    borderRadius: R.md,
    backgroundColor: C.warnWash,
    borderWidth: 1,
    borderColor: C.warnLine,
  },
  safetyCompact: { gap: S.sm, paddingVertical: 10, paddingHorizontal: S.md, borderRadius: R.sm },
  safetyBody: { flex: 1, gap: S.xs },
  safetyTitle: { fontFamily: F.uiBold, fontSize: 14, color: C.boostTx },
  safetyText: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.warnTx },
  safetyTextSmall: { fontSize: 12, lineHeight: 17 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.xs, height: 56 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: F.uiBold, fontSize: 17, color: C.ink },
  headerSide: { minWidth: 44, alignItems: 'flex-end' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xl, gap: S.sm },
  emptyTitle: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  emptyText: {
    fontFamily: F.ui,
    fontSize: 13,
    lineHeight: 19,
    color: C.inkSoft,
    textAlign: 'center',
  },
});

const ICON_VARIANT = StyleSheet.create({
  plain: {},
  float: { borderRadius: R.full, backgroundColor: C.paperWarm, ...shadow },
  glass: { borderRadius: R.full, backgroundColor: C.glass },
  outline: {
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
});
