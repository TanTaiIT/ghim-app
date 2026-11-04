import { StyleSheet, Text, View } from 'react-native';
import type { SuggestionPage } from '@/api/client';
import { ListingRow } from './ListingCard';
import { EmptyState, Loading, OutlineButton, SectionTitle } from './ui';
import { C, F, S } from '@/theme';

/**
 * "Gợi ý cho bạn" của trang chủ (ghim-server add-home-suggestions): mỗi tin một dòng, "Xem thêm" tải trang kế. Dòng phụ
 * nói gợi ý dựa trên gì — lịch sử của người dùng chỉ được dùng khi họ để bật "Gợi ý theo hoạt động", nên phải thấy được.
 * Trái tim chỉ hiện khi route truyền `onToggleSave` (mutation khởi phát từ route, folder §6).
 */
export function SuggestionList({
  pages,
  pending,
  error,
  hasMore,
  loadingMore,
  onMore,
  onOpen,
  saved,
  onToggleSave,
}: {
  pages: SuggestionPage[] | undefined;
  pending: boolean;
  error: Error | null;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
  onOpen: (id: string) => void;
  saved: ReadonlySet<string> | undefined;
  onToggleSave?: (id: string) => void;
}) {
  const items = pages?.flatMap((page) => page.items) ?? [];
  const personalized = pages?.[0]?.personalized ?? false;

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <SectionTitle title="Gợi ý cho bạn" />
        <Text style={styles.note}>
          {personalized
            ? 'Dựa trên tin bạn đã xem, lưu, hỏi và tìm'
            : 'Được quan tâm nhiều gần bạn'}
        </Text>
      </View>
      {pending ? (
        <Loading />
      ) : error ? (
        <EmptyState icon="wifi-off" text={error.message} />
      ) : items.length === 0 ? (
        <EmptyState icon="compass" text="Chưa có tin nào để gợi ý. Kéo xuống để tải lại." />
      ) : (
        <>
          {items.map((item) => (
            <ListingRow
              key={item.id}
              item={item}
              onPress={() => onOpen(item.id)}
              saved={saved?.has(item.id) ?? false}
              {...(onToggleSave ? { onToggleSave: () => onToggleSave(item.id) } : {})}
            />
          ))}
          {hasMore && <OutlineButton label="Xem thêm" loading={loadingMore} onPress={onMore} />}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: S.md },
  head: { gap: 2 },
  note: { fontFamily: F.ui, fontSize: 13, color: C.muted },
});
