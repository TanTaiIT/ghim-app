import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { OpsHeader } from '@/components/OpsHeader';
import { Photo } from '@/components/Photo';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, GhostButton, Loading } from '@/components/ui';
import type { WhitelistEntry } from '@/api/ops-screening';
import { useRemoveWhitelist, useWhitelist } from '@/queries/ops-screening';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/**
 * Danh sách trắng ảnh (mọi staff, master — spec screening/image-checks): ảnh mẫu của hãng không tính là ảnh trùng. Thêm
 * từ một việc duyệt có ảnh ("Ảnh mẫu của hãng → danh sách trắng"), vì ảnh phải đã nằm trong kho; gỡ thì tin gửi sau
 * dùng ảnh đó lại dính "ảnh trùng".
 */
export default function OpsWhitelist() {
  const toast = useToast();
  const list = useWhitelist();
  const remove = useRemoveWhitelist();
  const [picked, setPicked] = useState<WhitelistEntry | null>(null);

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Danh sách trắng ảnh" sub="Ảnh mẫu của hãng không tính là trùng" />
      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <EmptyState icon="image" text={list.error.message} />
      ) : (
        <FlatList
          data={list.data}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.note}>
              Thêm ảnh từ việc duyệt: mở việc có ảnh, bấm "Ảnh mẫu của hãng → danh sách trắng".
            </Text>
          }
          ListEmptyComponent={
            <EmptyState icon="image" title="Chưa có ảnh nào" text="Mọi ảnh trùng đều bị giữ." />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.uri ? (
                <Photo picture={{ uri: item.uri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.gone]}>
                  <Text style={styles.goneText}>Ảnh nguồn đã bị dọn</Text>
                </View>
              )}
              <View style={styles.body}>
                <Text style={styles.meta}>Đã thêm · {formatAgo(item.addedAt).toLowerCase()}</Text>
                <GhostButton label="Gỡ khỏi danh sách" onPress={() => setPicked(item)} />
              </View>
            </View>
          )}
        />
      )}
      <ConfirmSheet
        visible={picked !== null}
        title="Gỡ ảnh này khỏi danh sách trắng?"
        confirmLabel="Gỡ khỏi danh sách"
        note="Tin gửi sau dùng ảnh này mà trùng tin của tài khoản khác sẽ bị giữ cho người duyệt"
        onClose={() => setPicked(null)}
        onConfirm={() =>
          picked &&
          remove.mutate(picked.id, {
            onSuccess: () => toast('Đã gỡ ảnh khỏi danh sách trắng'),
            onError: (e) => toast(e.message),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  list: { padding: S.lg, gap: S.sm },
  note: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  thumb: { width: 72, height: 72, borderRadius: R.md },
  gone: { alignItems: 'center', justifyContent: 'center', padding: S.xs, backgroundColor: C.sand },
  goneText: { fontFamily: F.ui, fontSize: 10, color: C.inkSoft, textAlign: 'center' },
  body: { flex: 1, gap: S.xs },
  meta: { fontFamily: F.ui, fontSize: 13, color: C.inkSoft },
});
