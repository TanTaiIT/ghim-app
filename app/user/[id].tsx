import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ListingRow } from '@/components/ListingCard';
import { SellerCard } from '@/components/ListingInfo';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, IconButton, Loading, ScreenHeader } from '@/components/ui';
import { useMe } from '@/queries/account';
import { useSeller, useSellerListings } from '@/queries/listings';
import { useBlock } from '@/queries/settings';
import { C, F, S } from '@/theme';

/**
 * Trang người bán: hồ sơ công khai và các tin đang hiển thị. Khách xem được — server tự lọc tin theo phiên, nên route
 * không nằm trong khối cần đăng nhập. Người đã đăng nhập chặn được người bán từ đây (trừ chính mình).
 */
export default function SellerPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const me = useMe().data;
  const seller = useSeller(id);
  const listings = useSellerListings(id);
  const block = useBlock();
  const [confirm, setConfirm] = useState(false);

  if (seller.isPending) return <Loading />;
  if (seller.isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Người bán" />
        <EmptyState icon="alert-circle" text={seller.error.message} />
      </SafeAreaView>
    );
  }
  const canBlock = me !== undefined && me.id !== seller.data.id;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader
        title={seller.data.name}
        right={
          canBlock && (
            <IconButton icon="user-x" label="Chặn người này" onPress={() => setConfirm(true)} />
          )
        }
      />
      <FlatList
        data={listings.data ?? []}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <SellerCard seller={seller.data} />
            <Text style={styles.h2}>Tin đang đăng</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ListingRow item={item} onPress={() => router.push(`/listing/${item.id}`)} />
        )}
        ListEmptyComponent={
          listings.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              icon="package"
              text={listings.error?.message ?? 'Người bán chưa có tin nào đang hiển thị.'}
            />
          )
        }
      />

      <ConfirmSheet
        visible={confirm}
        title={`Chặn ${seller.data.name}?`}
        confirmLabel="Chặn"
        note="Hai bên không nhắn cho nhau được nữa, người đó không được báo. Bỏ chặn ở Cài đặt › Người đã chặn"
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          block.mutate(seller.data.id, {
            onSuccess: () => toast(`Đã chặn ${seller.data.name}`),
            onError: (e) => toast(e.message),
          })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  header: { gap: S.lg },
  h2: { fontFamily: F.uiBold, fontSize: 16, color: C.ink },
});
