import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Activity, Conversation } from '@/api/client';
import { Avatar } from './Avatar';
import { Photo } from './Photo';
import { IconButton, Price } from './ui';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/** Không có trạng thái (đội, có chặn, ai đó tắt) thì không viết gì — "Ngoại tuyến" là đoán, không phải dữ kiện. */
const activityText = (activity: Activity | null): string | null => {
  if (!activity) return null;
  if (activity.online) return 'Đang hoạt động';
  return activity.lastActiveAt ? `Hoạt động ${formatAgo(activity.lastActiveAt)}` : null;
};

/**
 * Đầu màn chat: bên kia, trạng thái hoạt động, dải tin đang bàn. Không có `onReport` = hội thoại với một đội, nơi
 * server không nhận báo cáo.
 */
export function ChatHeader({
  conversation: { peer, listing },
  onBack,
  onOpenListing,
  onReport,
  onBlock,
  onDelete,
}: {
  conversation: Pick<Conversation, 'peer' | 'listing'>;
  onBack: () => void;
  onOpenListing: (id: string) => void;
  onReport?: () => void;
  /** Chỉ hội thoại về tin — hội thoại với Hỗ trợ Ghim hay quản trị nhóm không chặn được (spec blocking). */
  onBlock?: () => void;
  onDelete: () => void;
}) {
  const activity = activityText(peer.activity);
  return (
    <>
      <View style={styles.header}>
        <IconButton icon="chevron-left" label="Quay lại" onPress={onBack} />
        <View>
          <Avatar name={peer.name} size={42} tone="solid" />
          {peer.activity?.online && <View style={styles.online} />}
        </View>
        <View style={styles.peer}>
          <Text style={styles.name} numberOfLines={1}>
            {peer.name}
          </Text>
          {activity && (
            <Text style={[styles.status, peer.activity?.online && styles.statusOn]}>
              {activity}
            </Text>
          )}
        </View>
        {onReport && <IconButton icon="flag" label="Báo cáo người này" onPress={onReport} />}
        {onBlock && <IconButton icon="user-x" label="Chặn người này" onPress={onBlock} />}
        <IconButton icon="trash-2" label="Xoá hội thoại" onPress={onDelete} />
      </View>

      {listing && (
        <Pressable
          accessibilityRole="link"
          onPress={() => onOpenListing(listing.id)}
          style={styles.strip}
        >
          <Photo picture={listing.cover} style={styles.stripThumb} />
          <View style={styles.stripBody}>
            <Text style={styles.stripTitle} numberOfLines={1}>
              {listing.title}
            </Text>
            {listing.price !== null && <Price value={listing.price} size={14} />}
          </View>
          <View style={styles.stripCta}>
            <Text style={styles.stripCtaText}>Xem tin</Text>
          </View>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: S.xs,
    paddingBottom: 10,
    paddingRight: S.sm,
    paddingLeft: S.xs,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.paperWarm,
  },
  online: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 11,
    height: 11,
    borderRadius: R.full,
    borderWidth: 2,
    borderColor: C.paperWarm,
    backgroundColor: C.brandBright,
  },
  peer: { flex: 1, gap: 1 },
  name: { flexShrink: 1, fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  status: { fontFamily: F.uiMedium, fontSize: 12, color: C.muted },
  statusOn: { color: C.brandTx },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: 10,
    paddingHorizontal: S.lg,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.paperWarm,
  },
  stripThumb: { width: 48, height: 48, borderRadius: R.sm },
  stripBody: { flex: 1, minWidth: 0, gap: 2 },
  stripTitle: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  stripCta: {
    height: 32,
    paddingHorizontal: S.md,
    borderRadius: R.sm,
    backgroundColor: C.sand,
    justifyContent: 'center',
  },
  stripCtaText: { fontFamily: F.uiBold, fontSize: 12, color: C.ink },
});
