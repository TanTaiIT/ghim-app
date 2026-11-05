import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { ListingCard } from '@/api/client';
import { ListingRow } from './ListingCard';
import { PageDots } from './PageDots';
import { SectionTitle } from './ui';
import { S } from '@/theme';

/**
 * Dải ngang "Tin nổi bật" ở đầu bảng tin sàn chung, danh mục, bảng tin nhóm (add-admin-boost). Rỗng thì không vẽ gì.
 * Mỗi tin là đúng thẻ một dòng của danh sách, rộng bằng khối nội dung: tin trả tiền để nổi bật không được trông nhỏ hơn
 * tin thường ngay bên dưới. Trượt từng thẻ, chấm dưới dải cho biết còn tin. `bleed` = lề ngang của khối cha: dải chạy
 * tràn ra mép màn hình rồi đệm lại bên trong.
 */
export function FeaturedRail({
  items,
  onOpen,
  bleed = S.lg,
  saved,
  onToggleSave,
}: {
  items: ListingCard[] | undefined;
  onOpen: (id: string) => void;
  bleed?: number;
  saved?: ReadonlySet<string> | undefined;
  onToggleSave?: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const page = width - bleed * 2;
  const step = page + S.md;
  const [index, setIndex] = useState(0);
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionTitle title="Tin nổi bật" />
      <FlatList
        horizontal
        data={items}
        keyExtractor={(l) => l.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / step))}
        contentContainerStyle={[styles.rail, { paddingHorizontal: bleed }]}
        style={{ marginHorizontal: -bleed }}
        renderItem={({ item }) => (
          <View style={{ width: page }}>
            <ListingRow
              item={item}
              onPress={() => onOpen(item.id)}
              saved={saved?.has(item.id) ?? false}
              {...(onToggleSave ? { onToggleSave: () => onToggleSave(item.id) } : {})}
            />
          </View>
        )}
      />
      <PageDots ids={items.map((l) => l.id)} index={index} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: S.md },
  rail: { gap: S.md },
});
