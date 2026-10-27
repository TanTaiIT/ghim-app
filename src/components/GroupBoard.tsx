import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { GROUP_ROLE_TAG, type Group } from '@/api/client';
import { Avatar } from './Avatar';
import { FeaturedRail } from './FeaturedRail';
import { ListingRow, ListingTile } from './ListingCard';
import { MemberRow } from './MemberRow';
import { EmptyState, Loading } from './ui';
import { useMe } from '@/queries/account';
import {
  useGroupAnnouncements,
  useGroupFeatured,
  useGroupListings,
  useGroupMembers,
} from '@/queries/groups';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

export type GroupTab = 'posts' | 'about' | 'members';

type VisibleGroup = Extract<Group, { visible: true }>;

/**
 * Thân trang nhóm theo tab. Mỗi phần chỉ tải khi người xem được thấy: thông báo nhóm cho thành viên, danh sách
 * thành viên cho chủ nhóm và điều hành viên — server từ chối mọi người khác, hỏi trước là chắc chắn nhận lỗi.
 */
export function GroupBoard({
  group: g,
  tab,
  onCompose,
  onOpenListing,
}: {
  group: VisibleGroup;
  tab: GroupTab;
  /** null = người xem không đăng được tin vào nhóm này. */
  onCompose: (() => void) | null;
  onOpenListing: (id: string) => void;
}) {
  const me = useMe();
  const manager = g.role === 'owner' || g.role === 'moderator';
  const listings = useGroupListings(g.id, tab === 'posts');
  const featured = useGroupFeatured(g.id, tab === 'posts');
  const announcements = useGroupAnnouncements(g.id, g.role !== null);
  const members = useGroupMembers(g.id, manager && tab === 'members');
  const latest = announcements.data?.[0];

  if (tab === 'about') {
    return (
      <View style={styles.body}>
        <Text style={styles.about}>{g.description ?? 'Nhóm chưa có mô tả.'}</Text>
        {announcements.data?.map((a) => (
          <View key={a.id} style={styles.announcement}>
            <Text style={styles.announcementText}>{a.body}</Text>
            <Text style={styles.time}>{formatAgo(a.at)}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (tab === 'members') {
    return (
      <View style={styles.body}>
        {members.isPending ? (
          <Loading />
        ) : (
          members.data?.map((m) => (
            <MemberRow key={m.id} name={m.name} tag={GROUP_ROLE_TAG[m.role]} />
          ))
        )}
      </View>
    );
  }

  return (
    <View style={styles.body}>
      {latest && (
        <View style={styles.pinned}>
          <Feather name="bookmark" size={18} color={C.brand} />
          <View style={styles.flex}>
            <Text style={styles.pinnedTitle}>Thông báo của nhóm · {formatAgo(latest.at)}</Text>
            <Text style={styles.pinnedText}>{latest.body}</Text>
          </View>
        </View>
      )}
      <FeaturedRail items={featured.data} onOpen={onOpenListing} />
      {onCompose && (
        <Pressable accessibilityRole="button" onPress={onCompose} style={styles.compose}>
          <Avatar name={me.data?.name ?? 'Bạn'} size={32} tone="brand" />
          <Text style={styles.composeText}>Đăng tin vào nhóm...</Text>
          <Feather name="camera" size={20} color={C.brand} />
        </Pressable>
      )}
      {onCompose && g.manualReview && (
        <Text style={styles.manual}>
          Nhóm duyệt mọi tin trước khi hiện — tin bạn đăng sẽ chờ quản trị nhóm duyệt.
        </Text>
      )}
      {listings.isPending ? (
        <Loading />
      ) : !listings.data?.length ? (
        <EmptyState icon="inbox" text="Nhóm chưa có tin nào." />
      ) : g.boardStyle === 'grid' ? (
        <View style={styles.grid}>
          {listings.data.map((l) => (
            <View key={l.id} style={styles.cell}>
              <ListingTile item={l} onPress={() => onOpenListing(l.id)} />
            </View>
          ))}
        </View>
      ) : (
        listings.data.map((l) => (
          <ListingRow key={l.id} item={l} onPress={() => onOpenListing(l.id)} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: S.lg, gap: S.md },
  flex: { flex: 1 },
  pinned: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: S.md,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.brandLine,
    backgroundColor: C.brandWash,
  },
  pinnedTitle: { fontFamily: F.uiBold, fontSize: 13, color: C.brandDark },
  pinnedText: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.brandDark },
  compose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  composeText: { flex: 1, fontFamily: F.ui, fontSize: 14, color: C.muted },
  manual: { marginTop: -S.xs, fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  cell: { width: '47%' },
  about: { fontFamily: F.ui, fontSize: 14, lineHeight: 22, color: C.inkMid },
  announcement: {
    gap: S.xs,
    padding: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  announcementText: { fontFamily: F.ui, fontSize: 14, lineHeight: 20, color: C.ink },
  time: { fontFamily: F.ui, fontSize: 12, color: C.muted },
});
