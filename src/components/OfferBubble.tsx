import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Message, OfferStatus } from '@/api/client';
import { C, F, R, S } from '@/theme';
import { formatVnd } from '@/utils/format';

type Offer = Extract<Message, { kind: 'offer' }>;
type Reply = 'accepted' | 'declined';

const MINE_CAPTION: Record<OfferStatus, string> = {
  pending: 'Bạn đã trả giá',
  accepted: 'Người bán đã chấp nhận giá',
  declined: 'Người bán đã từ chối giá này',
  superseded: 'Bạn đã trả giá khác',
};

/**
 * Thẻ đề nghị giá trong chat. Chỉ người mua trả giá (ghim-server spec messaging/price-offers): người mua thấy giá
 * của mình — viền đứt, gạch khi đã có giá mới hay bị từ chối; người bán thấy Chấp nhận / Từ chối khi đề nghị còn
 * chờ. Mỗi đề nghị chỉ trả lời được một lần, nên không có "Hoàn tác" — đổi ý thì người mua gửi giá mới.
 */
export function OfferBubble({
  offer,
  canReply,
  onReply,
  busy,
}: {
  offer: Offer;
  canReply: boolean;
  onReply: (status: Reply) => void;
  busy: boolean;
}) {
  const amount = formatVnd(offer.amount);

  if (offer.mine) {
    const struck = offer.status === 'superseded' || offer.status === 'declined';
    return (
      <View style={[styles.mine, styles.right]}>
        <Text style={styles.caption}>{MINE_CAPTION[offer.status]}</Text>
        <Text style={[styles.mineAmount, struck && styles.struck]}>{amount}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.theirs, styles.left]}>
      <View style={styles.head}>
        <Text style={styles.theirCaption}>Người mua trả giá</Text>
        <Text style={[styles.theirAmount, offer.status === 'superseded' && styles.struck]}>
          {amount}
        </Text>
      </View>
      {offer.status === 'pending' && canReply && (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onReply('accepted')}
            style={[styles.btn, styles.accept]}
          >
            <Text style={styles.acceptText}>Chấp nhận</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onReply('declined')}
            style={[styles.btn, styles.decline]}
          >
            <Text style={styles.declineText}>Từ chối</Text>
          </Pressable>
        </View>
      )}
      {offer.status === 'accepted' && (
        <View style={styles.result}>
          <Ionicons name="checkmark-circle" size={18} color={C.brandBright} />
          <Text style={styles.accepted}>Đã chốt giá · Hẹn lịch xem hàng</Text>
        </View>
      )}
      {offer.status === 'declined' && (
        <View style={styles.result}>
          <Text style={styles.declined}>Bạn đã từ chối đề nghị này</Text>
        </View>
      )}
      {offer.status === 'superseded' && (
        <View style={styles.result}>
          <Text style={styles.declined}>Người mua đã trả giá khác</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  right: { alignSelf: 'flex-end' },
  left: { alignSelf: 'flex-start' },
  mine: {
    width: '76%',
    paddingVertical: S.md,
    paddingHorizontal: 14,
    gap: 2,
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.lineStrong,
    backgroundColor: C.paperWarm,
  },
  caption: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  mineAmount: { fontFamily: F.uiBlack, fontSize: 17, color: C.ink },
  struck: { textDecorationLine: 'line-through', color: C.faint },
  theirs: {
    width: '82%',
    padding: 14,
    gap: 10,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.offerLine,
    backgroundColor: C.boost,
  },
  head: { gap: 2 },
  theirCaption: { fontFamily: F.uiSemi, fontSize: 12, color: C.boostTx },
  theirAmount: { fontFamily: F.uiBlack, fontSize: 20, color: C.warnTx },
  actions: { flexDirection: 'row', gap: S.sm },
  btn: { flex: 1, height: 44, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  accept: { backgroundColor: C.price },
  decline: { borderWidth: 1.5, borderColor: C.price, backgroundColor: C.paperWarm },
  acceptText: { fontFamily: F.uiBold, fontSize: 14, color: C.paperWarm },
  declineText: { fontFamily: F.uiBold, fontSize: 14, color: C.boostTx },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    paddingVertical: 10,
    paddingHorizontal: S.md,
    borderRadius: R.sm,
    backgroundColor: C.paperWarm,
  },
  accepted: { fontFamily: F.uiBold, fontSize: 13, color: C.brandDark },
  declined: { flex: 1, fontFamily: F.uiSemi, fontSize: 13, color: C.inkSoft },
});
