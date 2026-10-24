import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InputSheet } from '@/components/InputSheet';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, IconButton, Loading, OutlineButton, ScreenHeader } from '@/components/ui';
import { useCreateUnit, useDeleteUnit, useRenameUnit } from '@/queries/group-manage';
import { useGroup } from '@/queries/groups';
import { managerOf } from '@/api/group-manage';
import type { GroupUnit } from '@/api/client';
import { C, F, R, S } from '@/theme';

type Sheet = { kind: 'create' } | { kind: 'rename' | 'delete'; unit: GroupUnit } | null;

/** Lớp / phòng ban của nhóm — chỉ chủ nhóm; lớp còn thành viên thì server từ chối xoá (spec membership). */
export default function GroupUnits() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const group = useGroup(id);
  const create = useCreateUnit(id);
  const rename = useRenameUnit(id);
  const del = useDeleteUnit(id);
  const [sheet, setSheet] = useState<Sheet>(null);

  const g = managerOf(group.data);
  const owner = g?.role === 'owner' ? g : null;
  const fail = (e: Error) => toast(e.message);
  const done = (message: string) => {
    setSheet(null);
    toast(message);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader
        title="Lớp"
        right={
          owner && (
            <IconButton icon="plus" label="Thêm lớp" onPress={() => setSheet({ kind: 'create' })} />
          )
        }
      />
      <FlatList
        data={owner?.units ?? []}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <OutlineButton
              compact
              label="Đổi tên"
              onPress={() => setSheet({ kind: 'rename', unit: item })}
            />
            <OutlineButton
              compact
              label="Xoá"
              onPress={() => setSheet({ kind: 'delete', unit: item })}
            />
          </View>
        )}
        ListEmptyComponent={
          group.isPending ? (
            <Loading />
          ) : owner ? (
            <EmptyState
              icon="grid"
              text="Chưa có lớp nào. Thêm lớp để xếp thành viên, mời và gửi thông báo theo lớp."
            />
          ) : (
            <EmptyState
              icon="lock"
              text={group.error?.message ?? 'Chỉ chủ nhóm quản lý được lớp của nhóm.'}
            />
          )
        }
      />

      <InputSheet
        visible={sheet?.kind === 'create'}
        title="Thêm lớp"
        label="Tên lớp / phòng ban"
        placeholder="12A1"
        confirmLabel="Thêm"
        busy={create.isPending}
        onClose={() => setSheet(null)}
        onSubmit={(name) =>
          create.mutate(name, { onSuccess: () => done(`Đã thêm lớp ${name}`), onError: fail })
        }
      />
      <InputSheet
        visible={sheet?.kind === 'rename'}
        title={`Đổi tên ${sheet?.kind === 'rename' ? sheet.unit.name : ''}`}
        label="Tên mới"
        initial={sheet?.kind === 'rename' ? sheet.unit.name : ''}
        confirmLabel="Lưu"
        busy={rename.isPending}
        onClose={() => setSheet(null)}
        onSubmit={(name) =>
          sheet?.kind === 'rename' &&
          rename.mutate(
            { unitId: sheet.unit.id, name },
            { onSuccess: () => done('Đã đổi tên lớp'), onError: fail },
          )
        }
      />
      <ConfirmSheet
        visible={sheet?.kind === 'delete'}
        title={`Xoá lớp ${sheet?.kind === 'delete' ? sheet.unit.name : ''}?`}
        confirmLabel="Xoá lớp"
        note="Chỉ xoá được khi không còn thành viên nào trong lớp"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          sheet?.kind === 'delete' &&
          del.mutate(sheet.unit.id, { onSuccess: () => toast('Đã xoá lớp'), onError: fail })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  name: { flex: 1, fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
});
