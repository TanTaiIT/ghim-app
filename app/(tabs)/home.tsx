import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { CategoryGrid } from '@/components/CategoryGrid';
import { useGuardedPush } from '@/components/GuestGate';
import { FeaturedRail } from '@/components/FeaturedRail';
import { HomeHero } from '@/components/HomeHero';
import { ListingRow } from '@/components/ListingCard';
import { EmptyState, Loading, SectionTitle } from '@/components/ui';
import { useFeatured, useHomeFilters, useNearby } from '@/queries/listings';
import { C, F, R, S } from '@/theme';

/** Trang chủ "Khám phá" — khách xem được (TK 6); chỉ nút đăng tin mới đòi phiên. */
export default function Home() {
  const router = useRouter();
  const push = useGuardedPush();
  const filters = useHomeFilters();
  const featured = useFeatured(null);
  const nearby = useNearby(filters);
  const open = (id: string) => router.push(`/listing/${id}`);

  // Hero xanh đậm cần chữ thanh trạng thái màu sáng; rời màn thì trả lại mặc định tối của app.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={featured.isRefetching || nearby.isRefetching}
          onRefresh={() => {
            void featured.refetch();
            void nearby.refetch();
          }}
          tintColor={C.paperWarm}
        />
      }
    >
      <HomeHero />
      <View style={styles.main}>
        <CategoryGrid />

        <View style={styles.promo}>
          <View style={styles.promoIcon}>
            <Feather name="tag" size={26} color={C.price} />
          </View>
          <View style={styles.promoBody}>
            <Text style={styles.promoTitle}>Đăng tin miễn phí</Text>
            <Text style={styles.promoText}>Không giới hạn số tin trong tháng.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => push('/post')}
            style={styles.promoCta}
          >
            <Text style={styles.promoCtaText}>Đăng ngay</Text>
          </Pressable>
        </View>

        <FeaturedRail items={featured.data} onOpen={open} />

        <View style={styles.section}>
          <SectionTitle title="Gần bạn" />
          {nearby.isPending ? (
            <Loading />
          ) : nearby.isError ? (
            <EmptyState icon="wifi-off" text={nearby.error.message} />
          ) : nearby.data.length === 0 ? (
            <EmptyState
              icon="map-pin"
              text="Chưa có tin nào ở khu vực của bạn. Đổi khu vực trong Cài đặt để xem nơi khác."
            />
          ) : (
            nearby.data.map((l) => <ListingRow key={l.id} item={l} onPress={() => open(l.id)} />)
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  main: { paddingHorizontal: S.lg, paddingTop: S.lg + 4, paddingBottom: S.xl, gap: S.xl },
  section: { gap: S.md },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.lg,
    borderRadius: R.lg,
    backgroundColor: C.promoBg,
    borderWidth: 1,
    borderColor: C.promoLine,
  },
  promoIcon: {
    width: 48,
    height: 48,
    borderRadius: R.sm,
    backgroundColor: C.warnLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBody: { flex: 1, gap: S.xs },
  promoTitle: { fontFamily: F.uiBlack, fontSize: 17, color: C.warnTx },
  promoText: { fontFamily: F.ui, fontSize: 13, color: C.boostTx },
  promoCta: {
    height: 44,
    paddingHorizontal: S.lg,
    borderRadius: R.sm,
    backgroundColor: C.price,
    justifyContent: 'center',
  },
  promoCtaText: { fontFamily: F.uiBold, fontSize: 14, color: C.paperWarm },
});
