import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { CONDITION_LABEL, type ListingDetail, type Seller } from '@/api/client';
import { Avatar, Verified } from './Avatar';
import { PickerSheet } from './PickerSheet';
import { OutlineButton, Price, Tag, type IconName } from './ui';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/* Các khối nội dung của màn chi tiết tin — tách khỏi route để route chỉ còn bố cục và hành động. */

/** Nhãn tình trạng/danh mục, tên, giá, khu vực · thời gian · lượt xem. */
export function ListingSummary({ listing: l }: { listing: ListingDetail }) {
  const meta: { icon: IconName; text: string }[] = [
    { icon: 'map-pin', text: `${l.place.district}, ${l.place.city}` },
    { icon: 'clock', text: formatAgo(l.postedAt) },
    { icon: 'eye', text: `${l.views} lượt xem` },
  ];
  return (
    <View style={styles.block}>
      <View style={styles.tags}>
        <Tag label={CONDITION_LABEL[l.condition]} tone="brand" />
        <Tag label={[l.category.name, l.brand].filter(Boolean).join(' · ')} />
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

export function SellerCard({ seller, onOpen }: { seller: Seller; onOpen: () => void }) {
  return (
    <View style={styles.seller}>
      <Avatar name={seller.name} size={48} tone="solid" />
      <View style={styles.sellerBody}>
        <View style={styles.sellerName}>
          <Text style={styles.name}>{seller.name}</Text>
          {seller.verified && <Verified />}
        </View>
        <Text style={styles.small}>
          {seller.rating} ★ · {seller.deals} giao dịch · Phản hồi trong {seller.replyMinutes} phút
        </Text>
      </View>
      <OutlineButton compact label="Xem trang" onPress={onOpen} />
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

const REPORT_REASONS = [
  { value: 'scam', label: 'Có dấu hiệu lừa đảo' },
  { value: 'fake', label: 'Ảnh hoặc thông tin không thật' },
  { value: 'wrong-category', label: 'Sai danh mục' },
  { value: 'sold', label: 'Hàng đã bán' },
  { value: 'other', label: 'Lý do khác' },
];

/** Bảng lý do báo cáo (nút lá cờ). Gửi báo cáo là việc của route — sheet chỉ trả lý do đã chọn. */
export function ReportSheet({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (reason: string) => void;
  onClose: () => void;
}) {
  return (
    <PickerSheet
      visible={visible}
      title="Báo cáo tin này vì…"
      options={REPORT_REASONS}
      value={null}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
}

const styles = StyleSheet.create({
  block: { gap: S.sm },
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
