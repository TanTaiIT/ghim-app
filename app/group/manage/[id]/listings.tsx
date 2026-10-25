import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InputSheet } from '@/components/InputSheet';
import { ListingRow } from '@/components/ListingCard';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, OutlineButton, ScreenHeader } from '@/components/ui';
import { useDetachListing } from '@/queries/group-manage';
import { useGroupListings } from '@/queries/groups';
import type { ListingCard } from '@/api/client';
import { C, S } from '@/theme';

/**
 * Tin đang hiện trong nhóm, mỗi dòng một nút gỡ khỏi nhóm (tin không có việc mở). Cùng một bảng với trang việc: có lý
 * do là "trái quy định sàn" và chuyển lên staff, để trống là chỉ gỡ. Server kiểm vai và phạm vi lớp của tin.
 */
export default function GroupListings() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const listings = useGroupListings(id, true);
  const detach = useDetachListing(id);
  const [target, setTarget] = useState<ListingCard | null>(null);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Tin trong nhóm" />
      <FlatList
        data={listings.data ?? []}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.content}
        onRefresh={() => void listings.refetch()}
        refreshing={listings.isRefetching}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <ListingRow item={item} onPress={() => router.push(`/listing/${item.id}`)} />
            <OutlineButton compact label="Gỡ khỏi nhóm" onPress={() => setTarget(item)} />
          </View>
        )}
        ListEmptyComponent={
          listings.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              icon={listings.isError ? 'lock' : 'inbox'}
              text={listings.error?.message ?? 'Nhóm chưa có tin nào đang hiện.'}
            />
          )
        }
      />

      <InputSheet
        visible={target !== null}
        title={`Gỡ “${target?.title ?? ''}” khỏi nhóm`}
        note="Tin rời nhóm ngay, người đăng không chịu hệ quả nào khác. Ghi lý do nếu tin trái quy định của sàn — staff sẽ xem lại; để trống nếu chỉ không hợp với nhóm."
        label="Lý do vi phạm quy định sàn (tuỳ chọn)"
        placeholder="Bán hàng giả, hàng cấm…"
        confirmLabel="Gỡ khỏi nhóm"
        tone="dangerSoft"
        minLength={0}
        multiline
        busy={detach.isPending}
        onClose={() => setTarget(null)}
        onSubmit={(note) =>
          target &&
          detach.mutate(
            { listingId: target.id, note },
            {
              onSuccess: () => {
                setTarget(null);
                toast(note.trim() ? 'Đã gỡ khỏi nhóm và báo sàn' : 'Đã gỡ khỏi nhóm');
              },
              onError: (e) => toast(e.message),
            },
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  row: { gap: S.sm },
});
