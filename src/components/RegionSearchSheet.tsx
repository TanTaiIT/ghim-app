import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RegionHit } from '@/api/client';
import { REGION_SEARCH_MIN, useRegionSearch } from '@/queries/catalog';
import { C, F, R, S } from '@/theme';

/** Đợi người dùng ngừng gõ một nhịp mới hỏi server — mỗi phím một request là phí. */
const DEBOUNCE_MS = 300;

const noteOf = (h: RegionHit): string =>
  [
    h.kind === 'ward' ? h.provinceName : 'Tỉnh / thành phố',
    h.formerNames.length > 0 ? `trước là ${h.formerNames.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Tìm tỉnh hay phường theo tên mới, tên cũ (trước sáp nhập 01/07/2025) hay tên gọi tắt, không cần dấu — nhanh hơn cuộn
 * danh sách hàng trăm phường. Chọn một phường là chọn luôn tỉnh của nó; ghi vào đâu là việc của route.
 */
export function RegionSearchSheet({
  visible,
  onPick,
  onClose,
}: {
  visible: boolean;
  onPick: (hit: RegionHit) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setQ(text), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);
  const hits = useRegionSearch(q);
  const ready = q.trim().length >= REGION_SEARCH_MIN;

  const empty = !ready
    ? `Gõ ít nhất ${REGION_SEARCH_MIN} chữ: tên phường mới hay cũ, tên tỉnh hay tên gọi tắt, không cần dấu.`
    : hits.isError
      ? hits.error.message
      : hits.isPending
        ? 'Đang tìm…'
        : 'Không thấy khu vực nào khớp.';
  const list = ready ? (hits.data ?? []) : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
          <View style={styles.grip} />
          <Text style={styles.title}>Tìm khu vực theo tên</Text>
          <TextInput
            accessibilityLabel="Tên khu vực"
            value={text}
            onChangeText={setText}
            placeholder="VD: Bến Thành, Hà Tây, HN"
            placeholderTextColor={C.muted}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {list.length === 0 && <Text style={styles.empty}>{empty}</Text>}
            {list.map((h) => (
              <Pressable
                key={`${h.kind}-${h.code}`}
                accessibilityRole="button"
                onPress={() => {
                  onPick(h);
                  onClose();
                }}
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: C.sand }]}
              >
                <Text style={styles.optionLabel}>{h.name}</Text>
                <Text style={styles.note}>{noteOf(h)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.scrim },
  sheet: {
    maxHeight: '80%',
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
  input: {
    height: 46,
    paddingHorizontal: S.md,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.lineStrong,
    backgroundColor: C.sand,
    fontFamily: F.ui,
    fontSize: 15,
    color: C.ink,
  },
  empty: {
    paddingVertical: S.md,
    fontFamily: F.ui,
    fontSize: 13,
    lineHeight: 19,
    color: C.inkSoft,
  },
  option: { gap: 2, paddingVertical: 10, paddingHorizontal: S.sm, borderRadius: R.sm },
  optionLabel: { fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  note: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
});
