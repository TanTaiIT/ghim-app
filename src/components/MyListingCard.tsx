import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { myListingActions, type MyListing, type MyListingAction } from '@/api/client';
import { ENDED_TAG } from './ListingCard';
import { Photo } from './Photo';
import { PickerSheet } from './PickerSheet';
import { IconButton, Price, Tag } from './ui';
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
  expired: ENDED_TAG.expired,
  sold: ENDED_TAG.sold,
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
 * chưa lên sàn nên không có gì để đánh dấu đã bán; tin đã bán không sửa nữa. Hành động theo trạng thái
 * (rút, gia hạn, chuyển, xoá) nằm sau nút "⋯", vì tin nào cũng xoá được.
 *
 * Xoá không lấy lại được nên hỏi lại ngay trên thẻ (`confirmDelete`), không mở bảng thứ hai: trên iOS, Modal mở ngay
 * lúc Modal trước đang đóng thường không hiện, còn `Alert` không chạy trên web.
 */
export function MyListingCard({
  item,
  onPress,
  onEdit,
  onSold,
  onMore,
  confirmDelete,
}: {
  item: MyListing;
  onPress: () => void;
  onEdit: () => void;
  onSold: () => void;
  onMore: () => void;
  confirmDelete: { onConfirm: () => void; onCancel: () => void } | null;
}) {
  const s = status(item);
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Pressable accessibilityRole="link" onPress={onPress} style={styles.link}>
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
            {item.fixes.map((fix) => (
              <Text key={fix} style={styles.fix}>
                {fix}
              </Text>
            ))}
            {item.lookupCode && (
              <Text selectable style={styles.note}>
                Mã tra cứu <Text style={styles.code}>{item.lookupCode}</Text> — gửi mã này cho Hỗ
                trợ nếu bạn nghĩ đây là nhầm lẫn.
              </Text>
            )}
          </View>
        </Pressable>
        <IconButton
          icon="more-horizontal"
          label="Thao tác khác"
          color={C.inkSoft}
          onPress={onMore}
        />
      </View>
      {item.state === 'live' && (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onEdit} style={[styles.btn, styles.edit]}>
            <Text style={styles.editText}>Sửa</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onSold} style={[styles.btn, styles.sold]}>
            <Text style={styles.soldText}>Đã bán</Text>
          </Pressable>
        </View>
      )}
      {confirmDelete && (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>Xoá hẳn tin này? Không khôi phục được.</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={confirmDelete.onCancel}
              style={[styles.btn, styles.edit]}
            >
              <Text style={styles.editText}>Không xoá</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={confirmDelete.onConfirm}
              style={[styles.btn, styles.danger]}
            >
              <Text style={styles.dangerText}>Xoá tin</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const ACTION: Record<MyListingAction, { label: string; note: string }> = {
  withdraw: { label: 'Rút về nháp', note: 'Tin thôi chờ duyệt; sửa xong thì gửi lại' },
  renew: { label: 'Gia hạn tin', note: 'Tin được kiểm tra lại như một lượt đăng' },
  move: { label: 'Chuyển lên chợ chung', note: 'Đăng thành tin mới, tin cũ giữ nguyên' },
  delete: { label: 'Xoá tin', note: 'Không ai thấy tin này nữa, kể cả bạn' },
};

/** Bảng "⋯": chỉ hành động server nhận cho tin này. Gọi API là việc của route — sheet chỉ trả lựa chọn. */
export function MyListingActionSheet({
  item,
  onSelect,
  onClose,
}: {
  item: MyListing | null;
  onSelect: (action: MyListingAction) => void;
  onClose: () => void;
}) {
  return (
    <PickerSheet
      visible={item !== null}
      title={item?.title || 'Nháp chưa có tiêu đề'}
      options={(item ? myListingActions(item) : []).map((value) => ({ value, ...ACTION[value] }))}
      value={null}
      onSelect={onSelect}
      onClose={onClose}
    />
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
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  link: { flex: 1, flexDirection: 'row', gap: S.md },
  thumb: { width: 76, height: 76, borderRadius: R.sm },
  body: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  untitled: { color: C.muted },
  stats: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  stat: { marginRight: S.sm, fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  note: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  fix: { fontFamily: F.uiBold, fontSize: 12, lineHeight: 17, color: C.warnTx },
  code: { fontFamily: F.uiBold, color: C.ink, letterSpacing: 1 },
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
  sold: { backgroundColor: C.brandLt },
  soldText: { fontFamily: F.uiBold, fontSize: 13, color: C.brandDark },
  confirm: {
    gap: S.sm,
    padding: S.md,
    borderRadius: R.sm,
    backgroundColor: C.pinLight,
  },
  confirmText: { fontFamily: F.uiSemi, fontSize: 13, color: C.ink },
  danger: { backgroundColor: C.pin },
  dangerText: { fontFamily: F.uiBold, fontSize: 13, color: C.paperWarm },
});
