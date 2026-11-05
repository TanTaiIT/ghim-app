import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { CategoryGrid } from '@/components/CategoryGrid';
import { useGuarded, useGuardedPush } from '@/components/GuestGate';
import { FeaturedRail } from '@/components/FeaturedRail';
import { HomeHero } from '@/components/HomeHero';
import { PromoCarousel } from '@/components/PromoCarousel';
import { SuggestionGrid } from '@/components/SuggestionGrid';
import { useToast } from '@/components/Toast';
import { useFeatured, useHomeFilters, useSavedIds, useToggleSaved } from '@/queries/listings';
import { useSuggestions } from '@/queries/suggestions';
import { C, S } from '@/theme';

/**
 * Trang chủ "Khám phá" — khách xem được (TK 6); chỉ đăng tin, đẩy tin, lưu tin mới đòi phiên. Bố cục theo ảnh mẫu
 * 02/11/2026: banner trượt ngang, dải nổi bật thẻ ảnh lớn, "Gợi ý cho bạn" (ghim-server add-home-suggestions).
 */
export default function Home() {
  const router = useRouter();
  const push = useGuardedPush();
  const guarded = useGuarded();
  const toast = useToast();
  const { provinceCode } = useHomeFilters();
  const featured = useFeatured(null);
  const suggestions = useSuggestions(provinceCode);
  const savedIds = useSavedIds();
  const toggleSaved = useToggleSaved();
  const open = (id: string) => router.push(`/listing/${id}`);

  const toggle = (id: string) =>
    guarded(() => {
      const saved = !(savedIds.data?.has(id) ?? false);
      toggleSaved.mutate({ id, saved }, { onError: (e) => toast(e.message) });
    });

  // Trang kế hỏng thì lưới đã có vẫn giữ — lỗi đi một đường duy nhất là toast.
  const more = async () => {
    const result = await suggestions.fetchNextPage();
    if (result.isFetchNextPageError) toast(result.error.message);
  };

  // Hero teal cần chữ thanh trạng thái màu sáng; rời màn thì trả lại mặc định tối của app.
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
          refreshing={featured.isRefetching || suggestions.isRefetching}
          onRefresh={() => {
            void featured.refetch();
            void suggestions.refetch();
          }}
          tintColor={C.paperWarm}
        />
      }
    >
      <HomeHero />
      <View style={styles.main}>
        <CategoryGrid />

        <PromoCarousel
          items={[
            {
              key: 'post',
              icon: 'tag',
              title: 'Đăng tin miễn phí',
              text: 'Không mất phí — tin hợp lệ lên sàn ngay.',
              cta: 'Đăng ngay',
              tone: 'brand',
              onPress: () => push('/post'),
            },
            {
              key: 'boost',
              icon: 'zap',
              title: 'Đẩy tin bằng Xu',
              text: 'Đưa tin lên đầu bảng tin hay vào dải Tin nổi bật.',
              cta: 'Tin của tôi',
              tone: 'boost',
              onPress: () => push('/profile'),
            },
          ]}
        />

        <FeaturedRail cover items={featured.data} onOpen={open} />

        <SuggestionGrid
          pages={suggestions.data?.pages}
          featured={featured.data}
          pending={suggestions.isPending}
          error={suggestions.data ? null : suggestions.error}
          hasMore={suggestions.hasNextPage}
          loadingMore={suggestions.isFetchingNextPage}
          onMore={() => void more()}
          onOpen={open}
          saved={savedIds.data}
          onToggleSave={toggle}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  main: { paddingHorizontal: S.lg, paddingTop: S.lg + 4, paddingBottom: S.xl, gap: S.xl },
});
