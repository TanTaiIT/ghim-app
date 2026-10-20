import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ListingRow } from '@/components/ListingCard';
import { SellerCard } from '@/components/ListingInfo';
import { EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { useSeller, useSellerListings } from '@/queries/listings';
import { C, F, S } from '@/theme';

/**
 * Trang người bán: hồ sơ công khai và các tin đang hiển thị. Khách xem được — server tự lọc tin theo phiên, nên route
 * không nằm trong khối cần đăng nhập.
 */
export default function SellerPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const seller = useSeller(id);
  const listings = useSellerListings(id);

  if (seller.isPending) return <Loading />;
  if (seller.isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Người bán" />
        <EmptyState icon="alert-circle" text={seller.error.message} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title={seller.data.name} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  header: { gap: S.lg },
  h2: { fontFamily: F.uiBold, fontSize: 16, color: C.ink },
});
