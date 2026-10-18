import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { MyListing } from '@/api/client';
import { Photo } from './Photo';
import { Price, Tag } from './ui';
import { C, F, R, S } from '@/theme';
import { daysUntil } from '@/utils/format';

/** Còn từ ngần này ngày trở xuống thì nhãn chuyển cam "Hết hạn sau N ngày" — đủ sớm để kịp gia hạn. */
const EXPIRY_WARN_DAYS = 3;

type Tone = 'brand' | 'boost' | 'amber' | 'neutral';

const LABEL: Record<Exclude<MyListing['state'], 'live'>, { label: string; tone: Tone }> = {
  draft: { label: 'Bản nháp', tone: 'neutral' },
  checking: { label: 'Đang kiểm tra', tone: 'amber' },
  pending: { label: 'Chờ duyệt', tone: 'amber' },
  rejected: { label: 'Bị từ chối', tone: 'boost' },
  expired: { label: 'Đã hết hạn', tone: 'boost' },
  sold: { label: 'Đã bán', tone: 'neutral' },
};

function status(item: MyListing): { label: string; tone: Tone } {
  if (item.state !== 'live') return LABEL[item.state];
  const days = item.expiresAt === null ? null : daysUntil(item.expiresAt);
  return days !== null && days <= EXPIRY_WARN_DAYS
    ? { label: `Hết hạn sau ${days} ngày`, tone: 'boost' }
    : { label: 'Đang hiển thị', tone: 'brand' };
}

/**
 * Tin của tôi ở trang Cá nhân. Hàng nút chỉ có khi tin đang hiển thị — nháp, đang kiểm, chờ duyệt, bị từ chối
 * chưa lên sàn nên không có gì để đẩy hay đánh dấu đã bán; tin đã bán không sửa nữa.
 */
export function MyListingCard({
  item,
  onPress,
  onEdit,
  onBoost,
  onSold,
}: {
  item: MyListing;
  onPress: () => void;
  onEdit: () => void;
  onBoost: () => void;
  onSold: () => void;
}) {
  const s = status(item);
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="link" onPress={onPress} style={styles.top}>
        <Photo picture={item.cover} style={styles.thumb} />
        <View style={styles.body}>
          {/* Nháp được tạo ngay khi chọn ảnh đầu tiên, nên có thể chưa có tiêu đề hay giá. */}
          <Text style={[styles.title, !item.title && styles.untitled]} numberOfLines={2}>
            {item.title || 'Nháp chưa có tiêu đề'}
          </Text>
          {item.price > 0 && <Price value={item.price} />}
          {item.views !== null && item.saves !== null && (
            <View style={styles.stats}>
              <Feather name="eye" size={14} color={C.inkSoft} />
              <Text style={styles.stat}>{item.views}</Text>
              <Feather name="heart" size={14} color={C.inkSoft} />
              <Text style={styles.stat}>{item.saves}</Text>
            </View>
          )}
          <Tag label={s.label} tone={s.tone} />
          {item.note && <Text style={styles.note}>{item.note}</Text>}
        </View>
      </Pressable>
      {item.state === 'live' && (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onEdit} style={[styles.btn, styles.edit]}>
            <Text style={styles.editText}>Sửa</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onBoost}
            style={[styles.btn, styles.boost]}
          >
            <Feather name="zap" size={14} color={C.boostTx} />
            <Text style={styles.boostText}>Đẩy tin</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onSold} style={[styles.btn, styles.sold]}>
            <Text style={styles.soldText}>Đã bán</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: S.md,
    gap: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  top: { flexDirection: 'row', gap: S.md },
  thumb: { width: 76, height: 76, borderRadius: R.sm },
  body: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  untitled: { color: C.muted },
  stats: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  stat: { marginRight: S.sm, fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  note: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  actions: { flexDirection: 'row', gap: S.sm },
  btn: {
    flex: 1,
    flexDirection: 'row',
    gap: S.xs,
    height: 40,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  edit: { borderWidth: 1, borderColor: C.lineStrong },
  editText: { fontFamily: F.uiSemi, fontSize: 13, color: C.ink },
  boost: { backgroundColor: C.boost },
  boostText: { fontFamily: F.uiBold, fontSize: 13, color: C.boostTx },
  sold: { backgroundColor: C.brandLt },
  soldText: { fontFamily: F.uiBold, fontSize: 13, color: C.brandDark },
});
