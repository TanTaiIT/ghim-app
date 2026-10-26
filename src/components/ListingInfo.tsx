import { FlatList, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { CONDITION_LABEL, type ListingCard, type ListingDetail, type Seller } from '@/api/client';
import { Avatar, Verified } from './Avatar';
import { ListingTile } from './ListingCard';
import { OutlineButton, Price, Tag, type IconName } from './ui';
import { C, F, R, S } from '@/theme';
import { formatAgo, formatPlace } from '@/utils/format';

/* Các khối nội dung của màn chi tiết tin — tách khỏi route để route chỉ còn bố cục và hành động. */

/** Nhãn tình trạng/danh mục, tên, giá, khu vực · thời gian · lượt xem. */
export function ListingSummary({ listing: l }: { listing: ListingDetail }) {
  const meta: { icon: IconName; text: string }[] = [
    { icon: 'map-pin', text: formatPlace(l.place) },
    { icon: 'clock', text: formatAgo(l.postedAt) },
    ...(l.views === null ? [] : [{ icon: 'eye' as const, text: `${l.views} lượt xem` }]),
  ];
  const categoryLabel = [l.category.name, l.brand].filter(Boolean).join(' · ');
  return (
    <View style={styles.block}>
      <View style={styles.tags}>
        {l.condition && <Tag label={CONDITION_LABEL[l.condition]} tone="brand" />}
        {categoryLabel !== '' && <Tag label={categoryLabel} />}
      </View>
      <Text style={styles.title}>{l.title}</Text>
      <Price value={l.price} size={24} />
      <View style={styles.meta}>
        {meta.map((m) => (
          <View key={m.icon} style={styles.metaItem}>
            <Feather name={m.icon} size={15} color={C.inkSoft} />
            <Text style={styles.metaText}>{m.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Số liệu uy tín khi có; hồ sơ công khai chưa có thì ít nhất cho biết tài khoản đã bao lâu. */
function sellerLine(s: Seller): string | null {
  const stats = [
    s.rating === null ? null : `${s.rating} ★`,
    s.deals === null ? null : `${s.deals} giao dịch`,
    s.replyMinutes === null ? null : `Phản hồi trong ${s.replyMinutes} phút`,
  ].filter(Boolean);
  if (stats.length > 0) return stats.join(' · ');
  return s.joinedAt ? `Thành viên từ ${new Date(s.joinedAt).getFullYear()}` : null;
}

/** Không có `onOpen` = đang ở chính trang người bán, không còn chỗ nào để mở. */
export function SellerCard({ seller, onOpen }: { seller: Seller; onOpen?: () => void }) {
  const line = sellerLine(seller);
  return (
    <View style={styles.seller}>
      <Avatar name={seller.name} size={48} tone="solid" />
      <View style={styles.sellerBody}>
        <View style={styles.sellerName}>
          <Text style={styles.name}>{seller.name}</Text>
          {seller.verified && <Verified />}
        </View>
        {line && <Text style={styles.small}>{line}</Text>}
      </View>
      {onOpen && <OutlineButton compact label="Xem trang" onPress={onOpen} />}
    </View>
  );
}

export function SpecGrid({ specs }: { specs: ListingDetail['specs'] }) {
  return (
    <View style={styles.block}>
      <Text style={styles.h2}>Thông số</Text>
      <View style={styles.specs}>
        {specs.map((s) => (
          <View key={s.label} style={styles.spec}>
            <Text style={styles.small}>{s.label}</Text>
            <Text style={styles.specValue}>{s.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ListingDescription({ text }: { text: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.h2}>Mô tả</Text>
      <Text style={styles.body}>{text}</Text>
    </View>
  );
}

export function SimilarRail({
  items,
  onOpen,
}: {
  items: ListingCard[];
  onOpen: (id: string) => void;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.h2}>Tin tương tự</Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(x) => x.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        renderItem={({ item }) => (
          <ListingTile item={item} variant="mini" onPress={() => onOpen(item.id)} />
        )}
      />
    </View>
  );
}

/** Chỉ hiện cho người quản lý nhóm của huy hiệu: gỡ được huy hiệu, không gỡ được tin (spec group/badges). */
export function BadgeAdminRow({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <View style={styles.badgeAdmin}>
      <Text style={styles.badgeText}>Tin mang huy hiệu nhóm {name} mà bạn quản lý.</Text>
      <OutlineButton compact label="Gỡ huy hiệu" onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: S.sm },
  body: { fontFamily: F.ui, fontSize: 14, lineHeight: 22, color: C.inkMid },
  rail: { gap: S.md },
  badgeAdmin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    backgroundColor: C.sand,
  },
  badgeText: { flex: 1, fontFamily: F.ui, fontSize: 13, lineHeight: 18, color: C.inkMid },
  tags: { flexDirection: 'row', gap: 6 },
  title: { fontFamily: F.uiBlack, fontSize: 22, lineHeight: 29, color: C.ink },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  metaText: { fontFamily: F.ui, fontSize: 13, color: C.inkSoft },
  seller: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
  },
  sellerBody: { flex: 1, gap: 2 },
  sellerName: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  small: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  h2: { fontFamily: F.uiBold, fontSize: 16, color: C.ink },
  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  // Hai ô một hàng: basis dưới 50% để khe 8 vẫn lọt, `flexGrow` giãn ô cho kín hàng.
  spec: {
    flexGrow: 1,
    flexBasis: '40%',
    paddingVertical: 10,
    paddingHorizontal: S.md,
    borderRadius: R.sm,
    backgroundColor: C.sand,
    gap: 2,
  },
  specValue: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
});
