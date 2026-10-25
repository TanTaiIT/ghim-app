import { FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionRow } from '@/components/ActionRow';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { useCategories, useProvinces } from '@/queries/catalog';
import { useDeleteSavedSearch, useSavedSearches } from '@/queries/listings';
import type { SavedSearch, SearchFilters } from '@/api/client';
import { C, S } from '@/theme';
import { formatAgo, formatVnd } from '@/utils/format';
import { toSearchParams } from '@/utils/search-params';

function priceRange(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `${formatVnd(min)} – ${formatVnd(max)}`;
  if (min !== null) return `Từ ${formatVnd(min)}`;
  return max === null ? null : `Đến ${formatVnd(max)}`;
}

/**
 * Lượt tìm đã lưu (ghim-server add-saved-searches): tin mới khớp lượt nào thì có thông báo nhóm "Tìm kiếm đã lưu". Bấm
 * hàng mở lại màn tìm kiếm đúng bộ lọc đã lưu; "Xoá" là thôi được báo.
 */
export default function SavedSearches() {
  const router = useRouter();
  const toast = useToast();
  const searches = useSavedSearches();
  const remove = useDeleteSavedSearch();
  const categories = useCategories();
  const provinces = useProvinces();

  const describe = (f: SearchFilters): string =>
    [
      categories.data?.find((c) => c.id === f.categoryId)?.name ??
        (f.categoryId ? 'Một danh mục' : 'Mọi danh mục'),
      provinces.data?.find((p) => p.code === f.provinceCode)?.name ?? 'Toàn quốc',
      priceRange(f.minPrice, f.maxPrice),
    ]
      .filter(Boolean)
      .join(' · ');

  const open = (s: SavedSearch) =>
    router.push({ pathname: '/search', params: toSearchParams(s.filters) });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Tìm kiếm đã lưu" />
      <FlatList
        data={searches.data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        onRefresh={() => void searches.refetch()}
        refreshing={searches.isRefetching}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => open(item)}>
            <ActionRow
              icon="search"
              title={`“${item.filters.q}”`}
              meta={`${describe(item.filters)} · lưu ${formatAgo(item.createdAt)}`}
              action={{
                label: 'Xoá',
                onPress: () =>
                  remove.mutate(item.id, {
                    onSuccess: () => toast('Đã xoá — không báo tin mới cho lượt tìm này nữa'),
                    onError: (e) => toast(e.message),
                  }),
              }}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          searches.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              icon="bell"
              text={
                searches.error?.message ??
                'Chưa lưu lượt tìm nào. Tìm một món rồi bấm "Lưu" ở dải "Báo cho tôi khi có tin mới".'
              }
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.sm },
});
