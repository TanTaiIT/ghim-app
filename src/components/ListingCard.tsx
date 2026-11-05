import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ListingCard } from '@/api/client';
import { Photo } from './Photo';
import { Price, Tag } from './ui';
import { C, F, R, S } from '@/theme';
import { formatAgo, formatPlace } from '@/utils/format';

/** Nhãn của tin đã kết thúc — dùng chung với "Tin của tôi" để hai nơi gọi một trạng thái bằng một chữ. */
export const ENDED_TAG = {
  sold: { label: 'Đã bán', tone: 'neutral' },
  expired: { label: 'Đã hết hạn', tone: 'boost' },
} as const;

/**
 * Thẻ tin dạng ô: `grid` (bảng tin nhóm chọn kiểu lưới), `mini` (Tin tương tự — chỉ ảnh, tên, giá). Danh sách dọc và
 * dải Tin nổi bật dùng `ListingRow`.
 */
export function ListingTile({
  item,
  onPress,
  variant = 'grid',
}: {
  item: ListingCard;
  onPress: () => void;
  variant?: 'grid' | 'mini';
}) {
  const mini = variant === 'mini';
  const free = item.price === 0;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        mini ? styles.mini : styles.grid,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View>
        <Photo picture={item.cover} style={mini ? styles.photoMini : styles.photoGrid} />
        {!mini && (item.boosted || free) && (
          <View style={styles.badge}>
            {item.boosted && <Tag label="Nổi bật" tone="boost" icon="zap" />}
            {free && <Tag label="Miễn phí" tone="free" icon="gift" />}
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={mini ? styles.titleMini : styles.title} numberOfLines={mini ? 1 : 2}>
          {item.title}
        </Text>
        <View style={styles.priceRow}>
          <Price value={item.price} size={mini ? 14 : 15} />
          {variant === 'grid' && item.negotiable && (
            <Text style={styles.nego} numberOfLines={1}>
              Thương lượng
            </Text>
          )}
        </View>
        {!mini && (
          <Text style={styles.meta} numberOfLines={1}>
            {formatPlace(item.place, true)} · {formatAgo(item.postedAt, undefined, true)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

type Chip = { icon: keyof typeof Feather.glyphMap; label: string };

function chipsOf(item: ListingCard): Chip[] {
  const chips: Chip[] = [];
  if (item.negotiable) chips.push({ icon: 'repeat', label: 'Thương lượng' });
  if (item.delivery) chips.push({ icon: 'truck', label: 'Giao tận nơi' });
  if (item.groupName) chips.push({ icon: 'users', label: item.groupName });
  return chips;
}

/**
 * Một tin một dòng (ảnh mẫu 04/11/2026) cho mọi danh sách tin dọc: ảnh lớn toàn bề ngang mang nhãn nổi bật / miễn phí /
 * đã kết thúc, chip điểm nổi bật, tiêu đề, khu vực, rồi lúc đăng và giá. Trái tim chỉ hiện khi màn truyền `onToggleSave` —
 * mutation khởi phát từ route, không từ component (folder §6).
 */
export function ListingRow({
  item,
  onPress,
  saved = false,
  onToggleSave,
}: {
  item: ListingCard;
  onPress: () => void;
  saved?: boolean;
  onToggleSave?: () => void;
}) {
  const chips = chipsOf(item);
  const free = item.price === 0;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.9 : 1 }]}
    >
      <View>
        <Photo picture={item.cover} style={styles.cover} />
        {(item.boosted || free) && !item.ended && (
          <View style={styles.badge}>
            {item.boosted && <Tag label="Nổi bật" tone="boost" icon="zap" />}
            {free && <Tag label="Miễn phí" tone="free" icon="gift" />}
          </View>
        )}
        {item.ended && (
          <View style={styles.endedTag}>
            <Tag label={ENDED_TAG[item.ended].label} tone={ENDED_TAG[item.ended].tone} />
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
              size={22}
              color={saved ? C.price : C.paperWarm}
            />
          </Pressable>
        )}
      </View>
      {chips.length > 0 && (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <View key={chip.label} style={styles.chip}>
              <Feather name={chip.icon} size={14} color={C.brand} />
              <Text style={styles.chipText} numberOfLines={1}>
                {chip.label}
              </Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.rowTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={styles.line}>
        <Feather name="map-pin" size={15} color={C.muted} />
        <Text style={styles.lineText} numberOfLines={1}>
          {formatPlace(item.place)}
        </Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.line}>
          <Feather name="clock" size={14} color={C.muted} />
          <Text style={styles.lineText} numberOfLines={1}>
            {formatAgo(item.postedAt)}
          </Text>
        </View>
        <Price value={item.price} size={20} />
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
  grid: { flex: 1 },
  mini: { width: 160 },
  photoGrid: { height: 150 },
  photoMini: { height: 104 },
  badge: { position: 'absolute', top: S.sm, left: S.sm, gap: S.xs },
  body: { paddingHorizontal: S.md, paddingTop: 10, paddingBottom: S.md, gap: S.xs },
  // Chiều cao cố định đúng hai dòng: các ô cùng hàng giữ giá thẳng hàng dù tiêu đề dài ngắn khác nhau.
  title: { fontFamily: F.uiSemi, fontSize: 14, lineHeight: 18, height: 36, color: C.ink },
  titleMini: { fontFamily: F.uiSemi, fontSize: 13, color: C.ink },
  meta: { flexShrink: 1, fontFamily: F.ui, fontSize: 12, color: C.muted },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: S.xs },
  nego: { flexShrink: 1, fontFamily: F.ui, fontSize: 11, color: C.muted },
  row: {
    padding: S.md,
    gap: S.md,
    backgroundColor: C.paperWarm,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.lg,
  },
  cover: { width: '100%', aspectRatio: 16 / 10, borderRadius: R.md },
  endedTag: { position: 'absolute', right: S.sm, bottom: S.sm },
  heart: {
    position: 'absolute',
    top: S.sm,
    right: S.sm,
    width: 40,
    height: 40,
    borderRadius: R.full,
    backgroundColor: C.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    height: 30,
    paddingHorizontal: S.md,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.sand,
  },
  chipText: { flexShrink: 1, fontFamily: F.uiMedium, fontSize: 13, color: C.inkSoft },
  rowTitle: { fontFamily: F.uiBlack, fontSize: 17, lineHeight: 23, color: C.ink },
  line: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  lineText: { flexShrink: 1, fontFamily: F.ui, fontSize: 14, color: C.inkSoft },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: S.md,
    paddingTop: S.md,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
});
