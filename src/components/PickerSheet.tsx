import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, R, S } from '@/theme';

type PickerOption<T extends string> = { value: T; label: string; note?: string };

/**
 * Bảng chọn trượt từ dưới lên — một bản cho mọi ô "chọn …" của bộ UI (khu vực, giá, tình trạng, sắp
 * xếp, danh mục, lý do báo cáo). `value` null = chưa chọn gì; chọn xong tự đóng, vì mọi chỗ dùng đều chỉ
 * chọn một.
 */
export function PickerSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: PickerOption<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
        <View style={styles.grip} />
        <Text style={styles.title}>{title}</Text>
        <ScrollView>
          {options.map((o) => {
            const on = o.value === value;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  onSelect(o.value);
                  onClose();
                }}
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: C.sand }]}
              >
                <View style={styles.optionBody}>
                  <Text style={[styles.optionLabel, on && { color: C.brandDark }]}>{o.label}</Text>
                  {o.note && <Text style={styles.note}>{o.note}</Text>}
                </View>
                {on && <Feather name="check" size={20} color={C.brand} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

/**
 * Hỏi lại trước thao tác không lấy lại được, bằng chính bảng chọn: `Alert` không chạy trên web. Mở thẳng từ một nút,
 * đừng mở ngay lúc một bảng khác đang đóng — trên iOS, Modal mở lúc đó thường không hiện.
 */
export function ConfirmSheet({
  visible,
  title,
  confirmLabel,
  note,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  confirmLabel: string;
  note: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <PickerSheet
      visible={visible}
      title={title}
      options={[
        { value: 'confirm', label: confirmLabel, note },
        { value: 'cancel', label: 'Không' },
      ]}
      value={null}
      onSelect={(v) => v === 'confirm' && onConfirm()}
      onClose={onClose}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.scrim },
  sheet: {
    maxHeight: '70%',
    backgroundColor: C.paperWarm,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S.sm,
    paddingHorizontal: S.lg,
    gap: S.sm,
  },
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.lineStrong,
  },
  title: { fontFamily: F.uiBold, fontSize: 17, color: C.ink, paddingVertical: S.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    minHeight: 52,
    paddingHorizontal: S.sm,
    borderRadius: R.sm,
  },
  optionBody: { flex: 1, gap: 2 },
  optionLabel: { fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  note: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
});
