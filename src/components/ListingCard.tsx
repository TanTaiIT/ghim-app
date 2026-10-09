import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ListingCard } from '@/api/client';
import { Photo } from './Photo';
import { Avatar, Verified } from './Avatar';
import { Price, Tag } from './ui';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/**
 * Thẻ tin dạng ô: `featured` (dải ngang Tin nổi bật, luôn mang nhãn), `grid` (lưới hai cột kết quả
 * tìm kiếm, có trái tim và người bán), `mini` (Tin tương tự — chỉ ảnh, tên, giá). Trái tim chỉ hiện khi màn truyền `onToggleSave` — mutation khởi
 * phát từ route, không từ component (folder §6).
 */
export function ListingTile({
  item,
  onPress,
  variant = 'grid',
  saved = false,
  onToggleSave,
}: {
  item: ListingCard;
  onPress: () => void;
  variant?: 'featured' | 'grid' | 'mini';
  saved?: boolean;
  onToggleSave?: () => void;
}) {
  const featured = variant === 'featured';
  const mini = variant === 'mini';
  const meta = featured
    ? `${item.place.district}, ${item.place.city}`
    : `${item.place.district} · ${formatAgo(item.postedAt, undefined, true)}`;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        featured ? styles.featured : mini ? styles.mini : styles.grid,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View>
        <Photo
          picture={item.cover}
          style={featured ? styles.photoFeatured : mini ? styles.photoMini : styles.photoGrid}
        />
        {(featured || (item.boosted && !mini)) && (
          <View style={styles.badge}>
            <Tag label="Nổi bật" tone="boost" icon="zap" />
          </View>
        )}
        {onToggleSave && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Bỏ lưu tin' : 'Lưu tin'}
            accessibilityState={{ selected: saved }}
            onPress={onToggleSave}
            hitSlop={6}
            style={styles.heart}
          >
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={17}
              color={saved ? C.price : C.ink}
            />
          </Pressable>
        )}
      </View>
      <View style={styles.body}>
        <Text style={mini ? styles.titleMini : styles.title} numberOfLines={mini ? 1 : 2}>
          {item.title}
        </Text>
        <Price value={item.price} size={mini ? 14 : 15} />
        {!mini && (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        )}
        {variant === 'grid' && (
          <View style={styles.seller}>
            <Avatar name={item.seller.name} />
            <Text style={styles.sellerName} numberOfLines={1}>
              {item.seller.name}
            </Text>
            {item.seller.verified && <Verified size={13} />}
          </View>
        )}
      </View>
    </Pressable>
  );
}

/**
 * Thẻ tin dạng hàng (Gần bạn, tin trong nhóm, tin đã lưu). `by="place"` ghi khu vực và nhãn nhóm;
 * `by="seller"` ghi người đăng — trong trang nhóm thì khu vực ít quan trọng hơn ai đăng.
 */
export function ListingRow({
  item,
  onPress,
  by = 'place',
}: {
  item: ListingCard;
  onPress: () => void;
  by?: 'place' | 'seller';
}) {
  const ago = formatAgo(item.postedAt);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Photo picture={item.cover} style={styles.thumb} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Price value={item.price} />
        {by === 'seller' ? (
          <View style={styles.seller}>
            <Avatar name={item.seller.name} />
            <Text style={styles.meta} numberOfLines={1}>
              {item.seller.name} · {ago}
            </Text>
          </View>
        ) : (
          <Text style={styles.meta} numberOfLines={1}>
            {item.place.district} · {ago}
          </Text>
        )}
        {by === 'place' && item.groupName && (
          <View style={styles.group}>
            <Feather name="users" size={12} color={C.brandDark} />
            <Text style={styles.groupLabel} numberOfLines={1}>
              {item.groupName}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: C.paperWarm,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.lg,
    overflow: 'hidden',
  },
  featured: { width: 168 },
  grid: { flex: 1 },
  mini: { width: 160 },
  photoFeatured: { height: 128 },
  photoGrid: { height: 150 },
  photoMini: { height: 104 },
  badge: { position: 'absolute', top: S.sm, left: S.sm },
  heart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: R.full,
    backgroundColor: C.paperWarm,
    opacity: 0.94,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: S.md, paddingTop: 10, paddingBottom: S.md, gap: S.xs },
  // Chiều cao cố định đúng hai dòng: các ô cùng hàng giữ giá thẳng hàng dù tiêu đề dài ngắn khác nhau.
  title: { fontFamily: F.uiSemi, fontSize: 14, lineHeight: 18, height: 36, color: C.ink },
  titleMini: { fontFamily: F.uiSemi, fontSize: 13, color: C.ink },
  meta: { flexShrink: 1, fontFamily: F.ui, fontSize: 12, color: C.muted },
  seller: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  sellerName: { flexShrink: 1, fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  row: {
    flexDirection: 'row',
    gap: S.md,
    padding: 10,
    backgroundColor: C.paperWarm,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.lg,
  },
  thumb: { width: 92, height: 92, borderRadius: R.sm },
  rowBody: { flex: 1, minWidth: 0, gap: S.xs, paddingTop: 2 },
  rowTitle: { fontFamily: F.uiSemi, fontSize: 15, lineHeight: 20, color: C.ink },
  group: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    height: 22,
    maxWidth: '100%',
    paddingHorizontal: S.sm,
    borderRadius: R.full,
    backgroundColor: C.brandLt,
  },
  groupLabel: { flexShrink: 1, fontFamily: F.uiSemi, fontSize: 11, color: C.brandDark },
});
