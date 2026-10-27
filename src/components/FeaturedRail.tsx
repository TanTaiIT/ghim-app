import { FlatList, StyleSheet, View } from 'react-native';
import type { ListingCard } from '@/api/client';
import { ListingTile } from './ListingCard';
import { SectionTitle } from './ui';
import { S } from '@/theme';

/**
 * Dải ngang "Tin nổi bật" ở đầu bảng tin sàn chung, danh mục, bảng tin nhóm (add-admin-boost). Rỗng thì không vẽ gì.
 * `bleed` = lề ngang của khối cha: dải chạy tràn ra mép màn hình rồi đệm lại bên trong.
 */
export function FeaturedRail({
  items,
  onOpen,
  bleed = S.lg,
}: {
  items: ListingCard[] | undefined;
  onOpen: (id: string) => void;
  bleed?: number;
}) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionTitle title="Tin nổi bật" />
      <FlatList
        horizontal
        data={items}
        keyExtractor={(l) => l.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.rail, { paddingHorizontal: bleed }]}
        style={{ marginHorizontal: -bleed }}
        renderItem={({ item }) => (
          <ListingTile item={item} variant="featured" onPress={() => onOpen(item.id)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: S.md },
  rail: { gap: S.md },
});
