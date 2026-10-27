import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGuarded } from '@/components/GuestGate';
import { FeaturedRail } from '@/components/FeaturedRail';
import { ListingTile } from '@/components/ListingCard';
import { SearchFilterBar } from '@/components/SearchFilterBar';
import { SortChip } from '@/components/SortChip';
import { useToast } from '@/components/Toast';
import { EmptyState, IconButton, Loading, useBack } from '@/components/ui';
import {
  useSaveSearch,
  useSavedIds,
  useSavedSearches,
  useDropStaleFilter,
  useFeatured,
  useSearch,
  useToggleSaved,
} from '@/queries/listings';
import { isSameSearch } from '@/api/client';
import { C, F, R, S } from '@/theme';
import { filtersFromParams, type SearchParams } from '@/utils/search-params';

/**
 * Kết quả tìm kiếm, xếp mới nhất hay theo giá (nút sắp xếp). Khu vực mặc định là toàn quốc vì chưa biết người
 * dùng ở đâu (`/me` chưa có khu vực).
 */
export default function Search() {
  const router = useRouter();
  const back = useBack();
  const toast = useToast();
  const guarded = useGuarded();
  const params = useLocalSearchParams<SearchParams>();
  const [text, setText] = useState(params.q ?? '');
  const [filters, setFilters] = useState(() => filtersFromParams(params));

  const results = useSearch(filters);
  useDropStaleFilter(results.error, filters, setFilters, toast);
  const savedIds = useSavedIds();
  const toggleSaved = useToggleSaved();
  const savedSearches = useSavedSearches();
  const saveSearch = useSaveSearch();

  const q = filters.q.trim();
  // Trang một danh mục (chưa gõ từ khoá) có dải "Tin nổi bật" của danh mục đó; tìm kiếm thì không.
  const featured = useFeatured(filters.categoryId, filters.categoryId !== null && q === '');
  const searchSaved = savedSearches.data?.some((s) => isSameSearch(s.filters, filters)) ?? false;
  // Lưới hai cột: số tin lẻ thì ô cuối giãn hết bề ngang — chèn một ô trống để nó giữ nửa hàng.
  const hits = results.data ?? [];
  const cells = hits.length % 2 === 1 ? [...hits, null] : hits;

  const toggle = (id: string) =>
    guarded(() => {
      const saved = !(savedIds.data?.has(id) ?? false);
      toggleSaved.mutate({ id, saved }, { onError: (e) => toast(e.message) });
    });

  const header = (
    <View style={styles.listHeader}>
      {filters.categoryId !== null && q === '' && (
        <FeaturedRail items={featured.data} onOpen={(id) => router.push(`/listing/${id}`)} />
      )}
      {q !== '' && (
        <View style={styles.alert}>
          <View style={styles.alertIcon}>
            <Feather name="bell" size={18} color={C.brand} />
          </View>
          <Text style={styles.alertText}>
            Báo cho tôi khi có tin mới khớp với <Text style={styles.bold}>“{q}”</Text>
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={searchSaved || saveSearch.isPending}
            onPress={() =>
              guarded(() =>
                saveSearch.mutate(filters, {
                  onSuccess: () => toast('Đã lưu tìm kiếm'),
                  onError: (e) => toast(e.message),
                }),
              )
            }
            style={[styles.alertBtn, searchSaved && styles.alertBtnDone]}
          >
            <Text style={[styles.alertBtnText, searchSaved && { color: C.brandDark }]}>
              {searchSaved ? 'Đã lưu' : 'Lưu'}
            </Text>
          </Pressable>
        </View>
      )}
      <View style={styles.resultBar}>
        <Text style={styles.resultText} numberOfLines={1}>
          {q ? 'Kết quả cho ' : 'Tất cả tin'}
          {q !== '' && <Text style={styles.resultQ}>“{q}”</Text>}
        </Text>
        <SortChip value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort })} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.top}>
        <View style={styles.searchRow}>
          <IconButton icon="chevron-left" label="Quay lại" onPress={back} />
          <View style={styles.input}>
            <Feather name="search" size={18} color={C.ink} />
            <TextInput
              accessibilityLabel="Tìm kiếm"
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => setFilters((f) => ({ ...f, q: text }))}
              placeholder="Bạn muốn tìm gì hôm nay?"
              placeholderTextColor={C.muted}
              returnKeyType="search"
              autoFocus={!params.q && !params.category}
              style={styles.inputText}
            />
          </View>
        </View>
        <SearchFilterBar filters={filters} onChange={setFilters} />
      </View>

      <FlatList
        data={cells}
        keyExtractor={(l, i) => l?.id ?? `pad-${i}`}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListEmptyComponent={
          results.isPending ? (
            <Loading />
          ) : results.isError ? (
            <EmptyState icon="wifi-off" text={results.error.message} />
          ) : (
            <EmptyState
              icon="search"
              title="Chưa có tin phù hợp"
              text="Thử bỏ bớt bộ lọc hoặc đổi từ khoá."
            />
          )
        }
        renderItem={({ item }) =>
          item === null ? (
            <View style={styles.pad} />
          ) : (
            <ListingTile
              item={item}
              onPress={() => router.push(`/listing/${item.id}`)}
              saved={savedIds.data?.has(item.id) ?? false}
              onToggleSave={() => toggle(item.id)}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paperWarm },
  top: {
    paddingHorizontal: S.lg,
    paddingBottom: S.md,
    gap: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginLeft: -S.sm },
  input: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.brandBright,
    backgroundColor: C.sand,
  },
  inputText: { flex: 1, fontFamily: F.ui, fontSize: 15, color: C.ink, paddingVertical: 0 },
  content: { flexGrow: 1, padding: S.lg, gap: S.md, backgroundColor: C.paper },
  column: { gap: S.md },
  pad: { flex: 1 },
  listHeader: { gap: 14, marginBottom: S.xs },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: S.md,
    paddingHorizontal: 14,
    borderRadius: R.md,
    backgroundColor: C.brandLt,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    backgroundColor: C.paperWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertText: { flex: 1, fontFamily: F.ui, fontSize: 13, lineHeight: 18, color: C.brandDark },
  bold: { fontFamily: F.uiBold },
  alertBtn: {
    height: 36,
    paddingHorizontal: S.md,
    borderRadius: R.sm,
    backgroundColor: C.brand,
    justifyContent: 'center',
  },
  alertBtnDone: { backgroundColor: C.paperWarm },
  alertBtnText: { fontFamily: F.uiBold, fontSize: 13, color: C.paperWarm },
  resultBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultText: { flex: 1, fontFamily: F.ui, fontSize: 14, color: C.inkSoft },
  resultQ: { fontFamily: F.uiBold, color: C.ink },
});
