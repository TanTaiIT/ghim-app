import { StyleSheet, Text, View } from 'react-native';
import type { MyStrike } from '@/api/client';
import { OutlineButton, Tag } from './ui';
import { C, F, R, S } from '@/theme';
import { formatDate } from '@/utils/format';

type Tone = 'brand' | 'boost' | 'amber' | 'neutral';

const KIND: Record<MyStrike['kind'], string> = {
  normal: 'Cảnh cáo',
  severe: 'Cảnh cáo nặng',
  serious: 'Vi phạm nghiêm trọng',
};

const CANCELLED: Record<NonNullable<MyStrike['cancelCause']>, string> = {
  appeal: 'Đã xoá sau khiếu nại',
  amnesty: 'Đã được ân xá',
  serious_cancel: 'Đã xoá',
};

const APPEAL: Record<NonNullable<MyStrike['appeal']>, string> = {
  pending: 'Khiếu nại đang chờ xét.',
  won: 'Khiếu nại được chấp nhận.',
  lost: 'Khiếu nại không được chấp nhận.',
  closed: 'Khiếu nại đã đóng.',
};

function status(s: MyStrike): { label: string; tone: Tone } {
  switch (s.status) {
    case 'active':
      return { label: 'Còn hiệu lực', tone: 'boost' };
    case 'permanent':
      return { label: 'Khoá vĩnh viễn', tone: 'boost' };
    case 'expired':
      return { label: 'Đã hết hạn', tone: 'neutral' };
    case 'lifted':
      return { label: 'Đã gỡ khoá', tone: 'brand' };
    case 'cancelled':
      return { label: s.cancelCause ? CANCELLED[s.cancelCause] : 'Đã xoá', tone: 'brand' };
  }
}

/**
 * Một cảnh cáo ở "Cảnh cáo của tôi". Nút "Khiếu nại" theo đúng `appealable` của server (thường / nặng, còn hạn, chưa
 * khiếu nại) — app không tự tính hạn. Vi phạm nghiêm trọng khoá tài khoản nên khiếu nại đi qua Hỗ trợ, không qua nút.
 */
export function StrikeCard({ item, onAppeal }: { item: MyStrike; onAppeal: () => void }) {
  const s = status(item);
  const dates = item.expiresAt
    ? `Ghi ngày ${formatDate(item.issuedAt)} · hết hạn ${formatDate(item.expiresAt)}`
    : `Ghi ngày ${formatDate(item.issuedAt)}`;
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.kind}>{KIND[item.kind]}</Text>
        <Tag label={s.label} tone={s.tone} />
      </View>
      <Text style={styles.rule}>{item.rule}</Text>
      <Text style={styles.meta}>{dates}</Text>
      {item.inForce && <Text style={styles.points}>Tính {item.points} điểm vi phạm</Text>}
      {item.appeal && <Text style={styles.meta}>{APPEAL[item.appeal]}</Text>}
      {item.appealable && item.appealUntil && (
        <View style={styles.appeal}>
          <Text style={styles.meta}>Khiếu nại được tới ngày {formatDate(item.appealUntil)}.</Text>
          <OutlineButton label="Khiếu nại" compact onPress={onAppeal} />
        </View>
      )}
      {item.kind === 'serious' && item.status === 'active' && item.appeal === null && (
        <Text style={styles.meta}>Khiếu nại vi phạm nghiêm trọng qua Hỗ trợ Ghim.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: S.md,
    gap: S.xs,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  kind: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  rule: { fontFamily: F.ui, fontSize: 14, lineHeight: 20, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  points: { fontFamily: F.uiBold, fontSize: 12, lineHeight: 17, color: C.warnTx },
  appeal: { gap: S.sm, marginTop: S.xs },
});
