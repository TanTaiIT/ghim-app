import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGuarded } from '@/components/GuestGate';
import { ListingTile } from '@/components/ListingCard';
import { PickerSheet } from '@/components/PickerSheet';
import { SearchFilterBar } from '@/components/SearchFilterBar';
import { useToast } from '@/components/Toast';
import { EmptyState, IconButton, Loading, useBack } from '@/components/ui';
import {
  useSaveSearch,
  useSavedIds,
  useSavedSearches,
  useSearch,
  useToggleSaved,
} from '@/queries/listings';
import { DEFAULT_CITY, toCategoryId, type SearchFilters, type SortOrder } from '@/api/client';
import { C, F, R, S } from '@/theme';

const SORTS: { value: SortOrder; label: string }[] = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-asc', label: 'Giá thấp trước' },
  { value: 'price-desc', label: 'Giá cao trước' },
];

export default function Search() {
  const router = useRouter();
  const back = useBack();
  const toast = useToast();
  const guarded = useGuarded();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const [text, setText] = useState(params.q ?? '');
  const [sortOpen, setSortOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    q: params.q ?? '',
    categoryId: toCategoryId(params.category),
    city: DEFAULT_CITY,
    minPrice: null,
    maxPrice: null,
    condition: null,
    sort: 'newest',
  });

  const results = useSearch(filters);
  const savedIds = useSavedIds();
  const toggleSaved = useToggleSaved();
  const savedSearches = useSavedSearches();
  const saveSearch = useSaveSearch();

  const q = filters.q.trim();
  const searchSaved = savedSearches.data?.includes(q.toLowerCase()) ?? false;
  const sortLabel = SORTS.find((s) => s.value === filters.sort)?.label ?? '';
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
                saveSearch.mutate(q, {
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
        <Pressable accessibilityRole="button" onPress={() => setSortOpen(true)} style={styles.sort}>
          <Text style={styles.sortText}>{sortLabel}</Text>
          <Feather name="chevron-down" size={14} color={C.ink} />
        </Pressable>
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

      <PickerSheet
        visible={sortOpen}
        title="Sắp xếp"
        options={SORTS}
        value={filters.sort}
        onSelect={(sort) => setFilters((f) => ({ ...f, sort }))}
        onClose={() => setSortOpen(false)}
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
  sort: { flexDirection: 'row', alignItems: 'center', gap: S.xs, height: 36, paddingLeft: S.sm },
  sortText: { fontFamily: F.uiSemi, fontSize: 13, color: C.ink },
});
