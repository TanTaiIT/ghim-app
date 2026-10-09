import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { Notice, NoticeKind } from '@/api/client';
import type { IconName } from './ui';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/** Loại "nóng" (giá, hạn, khuyến mãi) mang tông cam; còn lại tông xanh — đọc lướt cũng phân được. */
const KIND: Record<NoticeKind, { icon: IconName; warm: boolean }> = {
  offer: { icon: 'tag', warm: true },
  search: { icon: 'search', warm: false },
  expiring: { icon: 'clock', warm: true },
  approved: { icon: 'check-circle', warm: false },
  group: { icon: 'users', warm: false },
  promo: { icon: 'zap', warm: true },
};

export function NoticeCard({ notice, onPress }: { notice: Notice; onPress: () => void }) {
  const kind = KIND[notice.kind];
  const unread = !notice.read;
  return (
    <Pressable
      accessibilityRole="link"
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
        {notice.action && (
          <View style={styles.action}>
            <Text style={styles.actionText}>{notice.action}</Text>
          </View>
        )}
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
  action: {
    alignSelf: 'flex-start',
    marginTop: S.xs,
    height: 32,
    paddingHorizontal: S.md,
    borderRadius: R.sm,
    backgroundColor: C.brand,
    justifyContent: 'center',
  },
  actionText: { fontFamily: F.uiBold, fontSize: 12, color: C.paperWarm },
});
