import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GroupRow } from './GroupRow';
import { Loading } from './ui';
import { useProvinces } from '@/queries/catalog';
import { useGroupSearch, useMyGroups } from '@/queries/groups';
import type { GroupSummary } from '@/api/client';
import { C, F, R, S } from '@/theme';

const metaOf = (g: GroupSummary) =>
  `${g.memberCount} thành viên${g.description ? ` · ${g.description}` : ''}`;

/**
 * Chọn một nhóm để xem bảng tin của nhóm ngay trên màn tìm tin (chip "Nhóm"). Nguồn nhóm bám theo chip tỉnh/thành của
 * thanh lọc (add-group-province): đã chọn tỉnh thì chỉ hiện nhóm công khai của tỉnh đó; chưa chọn thì hiện nhóm người
 * dùng đã tham gia. Ô "Lọc theo tên" thu hẹp trong cùng nguồn đó. Tin trong nhóm không nằm ở chợ chung nên đây là lối
 * duy nhất đưa chúng vào màn tìm.
 */
export function GroupPickerSheet({
  visible,
  selectedId,
  provinceCode,
  onSelect,
  onClear,
  onClose,
}: {
  visible: boolean;
  selectedId: string | null;
  /** Tỉnh/thành đang lọc ở thanh lọc; null = chưa chọn → hiện nhóm đã tham gia. */
  provinceCode: number | null;
  onSelect: (group: GroupSummary) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const inProvince = provinceCode !== null;
  const provinces = useProvinces();
  const provinceName = provinces.data?.find((p) => p.code === provinceCode)?.name ?? null;

  const byProvince = useGroupSearch(q, provinceCode);
  const mine = useMyGroups();
  const groups: GroupSummary[] = inProvince
    ? (byProvince.data ?? [])
    : (mine.data ?? []).filter((g) => !term || g.name.toLowerCase().includes(term));
  const loading = inProvince ? byProvince.isPending : mine.isPending;

  const chooser = (g: GroupSummary) => () => {
    onSelect(g);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
        <View style={styles.grip} />
        <Text style={styles.title}>Xem tin theo nhóm</Text>
        <Text style={styles.subtitle}>
          {inProvince
            ? `Nhóm công khai ở ${provinceName ?? 'khu vực đã chọn'}`
            : 'Nhóm bạn đã tham gia — chọn tỉnh/thành ở thanh lọc để xem nhóm theo khu vực.'}
        </Text>
        <View style={styles.input}>
          <Feather name="search" size={16} color={C.inkSoft} />
          <TextInput
            accessibilityLabel="Lọc theo tên nhóm"
            value={q}
            onChangeText={setQ}
            placeholder="Lọc theo tên nhóm (tuỳ chọn)"
            placeholderTextColor={C.muted}
            returnKeyType="search"
            style={styles.inputText}
          />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.list}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClear();
              onClose();
            }}
            style={({ pressed }) => [styles.clear, pressed && { backgroundColor: C.sand }]}
          >
            <Feather name="grid" size={18} color={C.brand} />
            <Text style={styles.clearText}>Tất cả chợ chung</Text>
            {selectedId === null && <Feather name="check" size={18} color={C.brand} />}
          </Pressable>
          {loading ? (
            <Loading />
          ) : groups.length ? (
            groups.map((g) => (
              <GroupRow
                key={g.id}
                name={g.name}
                initials={g.initials}
                meta={metaOf(g)}
                onPress={chooser(g)}
              />
            ))
          ) : (
            <Text style={styles.hint}>
              {inProvince
                ? `Không có nhóm công khai nào ở ${provinceName ?? 'tỉnh này'}.`
                : 'Bạn chưa tham gia nhóm nào. Chọn tỉnh/thành ở thanh lọc để tìm nhóm theo khu vực.'}
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.scrim },
  sheet: {
    maxHeight: '78%',
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
  title: { fontFamily: F.uiBold, fontSize: 17, color: C.ink, paddingTop: S.sm },
  subtitle: { fontFamily: F.ui, fontSize: 13, lineHeight: 18, color: C.inkSoft },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.brandBright,
    backgroundColor: C.sand,
  },
  inputText: { flex: 1, fontFamily: F.ui, fontSize: 15, color: C.ink, paddingVertical: 0 },
  list: { marginTop: S.xs },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    minHeight: 48,
    paddingHorizontal: S.sm,
    borderRadius: R.sm,
  },
  clearText: { flex: 1, fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  hint: {
    paddingVertical: S.md,
    paddingHorizontal: S.sm,
    fontFamily: F.ui,
    fontSize: 13,
    lineHeight: 19,
    color: C.inkSoft,
  },
});
