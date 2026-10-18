import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { Notice, NoticeKind } from '@/api/client';
import type { IconName } from './ui';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/** Loại "nóng" (giá, hạn, tài khoản) mang tông cam; còn lại tông xanh — đọc lướt cũng phân được. */
const KIND: Record<NoticeKind, { icon: IconName; warm: boolean }> = {
  message: { icon: 'message-circle', warm: false },
  offer: { icon: 'tag', warm: true },
  listing: { icon: 'file-text', warm: false },
  expiring: { icon: 'clock', warm: true },
  group: { icon: 'users', warm: false },
  account: { icon: 'shield', warm: true },
};

export function NoticeCard({ notice, onPress }: { notice: Notice; onPress: () => void }) {
  const kind = KIND[notice.kind];
  const unread = !notice.read;
  return (
    <Pressable
      accessibilityRole={notice.target ? 'link' : 'button'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        unread && styles.unread,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: kind.warm ? C.boost : C.brandLt }]}>
        <Feather name={kind.icon} size={20} color={kind.warm ? C.price : C.brand} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{notice.title}</Text>
          {unread && <View accessibilityLabel="Chưa đọc" style={styles.dot} />}
        </View>
        <Text style={styles.text}>{notice.body}</Text>
        <Text style={styles.time}>{formatAgo(notice.at)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: S.md,
    padding: 14,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  unread: { borderColor: C.brandLine, backgroundColor: C.brandWash },
  icon: {
    width: 42,
    height: 42,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flexShrink: 1, fontFamily: F.uiBold, fontSize: 14, color: C.ink },
  dot: { width: 8, height: 8, borderRadius: R.full, backgroundColor: C.brand },
  text: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkMid },
  time: { fontFamily: F.ui, fontSize: 12, color: C.muted },
});
