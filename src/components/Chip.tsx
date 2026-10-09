import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { IconName } from './ui';
import { C, F, R, S } from '@/theme';

/* Ba kiểu ô chọn của bộ UI: chip bo tròn, ô chữ nhật, ô tích kèm nhãn. */

/** Chip bo tròn: bộ lọc, gợi ý trả lời nhanh. `dark` cho nút tổng bộ lọc. */
export function Chip({
  label,
  onPress,
  selected = false,
  dark = false,
  icon,
  chevron = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  dark?: boolean;
  icon?: IconName;
  chevron?: boolean;
}) {
  const fg = dark ? C.paperWarm : selected ? C.brandDark : C.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn, dark && styles.chipDark]}
    >
      {icon && <Feather name={icon} size={15} color={fg} />}
      <Text style={[styles.chipLabel, { color: fg }, (selected || dark) && styles.semi]}>
        {label}
      </Text>
      {chevron && <Feather name="chevron-down" size={14} color={fg} />}
    </Pressable>
  );
}

/** Ô lựa chọn chữ nhật (tình trạng hàng, chủ đề trợ giúp). */
export function Choice({
  label,
  onPress,
  selected,
  align = 'center',
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  align?: 'center' | 'left';
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.choice, align === 'left' && styles.choiceLeft, selected && styles.choiceOn]}
    >
      <Text style={[styles.choiceLabel, selected && { color: C.brandDark }]}>{label}</Text>
    </Pressable>
  );
}

/** Ô tích vuông. Có `label` thì cả hàng là vùng chạm; không có thì chỉ vẽ ô (nằm trong thẻ bấm được). */
export function Check({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label?: string;
  onPress?: () => void;
}) {
  const box = (
    <View style={[styles.box, checked && styles.boxOn]}>
      {checked && <Feather name="check" size={14} color={C.paperWarm} />}
    </View>
  );
  if (!label) return box;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.check}
    >
      {box}
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    height: 36,
    paddingHorizontal: S.md,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.lineStrong,
    backgroundColor: C.paperWarm,
  },
  chipOn: { borderWidth: 1.5, borderColor: C.brand, backgroundColor: C.brandLt },
  chipDark: { borderWidth: 0, backgroundColor: C.ink },
  chipLabel: { fontFamily: F.uiMedium, fontSize: 13 },
  semi: { fontFamily: F.uiSemi },
  choice: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.lineStrong,
    backgroundColor: C.paperWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceLeft: { minHeight: 52, alignItems: 'flex-start' },
  choiceOn: { borderWidth: 1.5, borderColor: C.brand, backgroundColor: C.brandLt },
  choiceLabel: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  checkLabel: { fontFamily: F.ui, fontSize: 14, color: C.ink },
  box: {
    width: 22,
    height: 22,
    borderRadius: R.xs,
    borderWidth: 1.5,
    borderColor: C.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { borderWidth: 0, backgroundColor: C.brand },
});
