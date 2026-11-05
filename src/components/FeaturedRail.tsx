import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ListingCard } from '@/api/client';
import { ListingTile } from './ListingCard';
import { Photo } from './Photo';
import { SectionTitle, Tag } from './ui';
import { C, F, R, S } from '@/theme';
import { formatPlace, formatPrice } from '@/utils/format';

/**
 * Dải ngang "Tin nổi bật" ở đầu bảng tin sàn chung, danh mục, bảng tin nhóm (add-admin-boost). Rỗng thì không vẽ gì.
 * `bleed` = lề ngang của khối cha: dải chạy tràn ra mép màn hình rồi đệm lại bên trong. `cover` = thẻ ảnh lớn có chữ
 * trên ảnh — trang chủ và trang danh mục dùng ảnh lớn cho nổi; bảng tin nhóm giữ ô nhỏ để kết quả lên sớm.
 */
export function FeaturedRail({
  items,
  onOpen,
  bleed = S.lg,
  cover = false,
}: {
  items: ListingCard[] | undefined;
  onOpen: (id: string) => void;
  bleed?: number;
  cover?: boolean;
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
        renderItem={({ item }) =>
          cover ? (
            <FeaturedCover item={item} onPress={() => onOpen(item.id)} />
          ) : (
            <ListingTile item={item} variant="featured" onPress={() => onOpen(item.id)} />
          )
        }
      />
    </View>
  );
}

function FeaturedCover({ item, onPress }: { item: ListingCard; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.cover, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Photo picture={item.cover} style={styles.coverPhoto} />
      <View style={styles.badge}>
        <Tag label="Nổi bật" tone="boost" icon="zap" />
      </View>
      <View style={styles.caption}>
        <Text style={styles.price}>{formatPrice(item.price)}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.place} numberOfLines={1}>
          {formatPlace(item.place, true)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: S.md },
  rail: { gap: S.md },
  cover: { width: 264, height: 184, borderRadius: R.lg, overflow: 'hidden' },
  coverPhoto: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: S.sm, left: S.sm },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.md,
    gap: 2,
    backgroundColor: C.scrim,
  },
  price: { fontFamily: F.uiBlack, fontSize: 17, color: C.paperWarm },
  title: { fontFamily: F.uiSemi, fontSize: 14, color: C.paperWarm },
  place: { fontFamily: F.ui, fontSize: 12, color: C.brandLine },
});
