import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OpsHeader } from '@/components/OpsHeader';
import { Photo } from '@/components/Photo';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading } from '@/components/ui';
import { useAddWhitelist } from '@/queries/ops-screening';
import { useOpsTask } from '@/queries/ops-review';
import { C, F, R, S } from '@/theme';

/** Chọn một ảnh của tin trong việc đang xử để đưa vào danh sách trắng — ảnh mẫu của hãng mà nhiều người cùng dùng. */
export default function OpsWhitelistAdd() {
  const { taskId = '' } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const toast = useToast();
  const task = useOpsTask(taskId);
  const add = useAddWhitelist();
  const [picked, setPicked] = useState<{ id: string; index: number } | null>(null);

  if (task.isPending) return <Loading />;
  const photos = task.data?.listing?.pictures ?? [];

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Thêm vào danh sách trắng" sub={task.data?.listing?.title ?? ''} />
      {photos.length === 0 ? (
        <EmptyState icon="image" text={task.error?.message ?? 'Việc này không có ảnh nào.'} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.note}>
            Chỉ chọn ảnh mẫu của hãng (ảnh quảng cáo, ảnh hộp) — ảnh người đăng tự chụp mà trùng là
            dấu hiệu lấy ảnh của người khác.
          </Text>
          <View style={styles.grid}>
            {photos.map((p, index) => (
              <Pressable
                key={p.id}
                accessibilityRole="imagebutton"
                accessibilityLabel={`Chọn ảnh ${index + 1}`}
                onPress={() => setPicked({ id: p.id, index })}
              >
                <Photo picture={p} style={styles.tile} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      <ConfirmSheet
        visible={picked !== null}
        title={`Đưa ảnh ${(picked?.index ?? 0) + 1} vào danh sách trắng?`}
        confirmLabel="Thêm vào danh sách trắng"
        note="Từ nay ảnh trùng với ảnh này không còn bị tính là ảnh trùng, với mọi tài khoản"
        onClose={() => setPicked(null)}
        onConfirm={() =>
          picked &&
          add.mutate(picked.id, {
            onSuccess: () => {
              toast('Đã thêm ảnh vào danh sách trắng');
              router.back();
            },
            onError: (e) => toast(e.message),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  note: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  tile: { width: 150, height: 150, borderRadius: R.md },
});
