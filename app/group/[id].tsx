import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuarded } from '@/components/GuestGate';
import { ListingRow } from '@/components/ListingCard';
import { GroupHeader } from '@/components/GroupHeader';
import { UnderlineTabs } from '@/components/TabStrip';
import { useToast } from '@/components/Toast';
import { Avatar, Verified } from '@/components/Avatar';
import { EmptyState, IconButton, Loading, Tag, useBack } from '@/components/ui';
import { useMe } from '@/queries/account';
import { useGroup, useGroupListings, useGroupMembers, useSetGroupJoined } from '@/queries/groups';
import { useOpenConversation } from '@/queries/messages';
import { useDraftStore } from '@/stores/draft';
import { C, F, R, S } from '@/theme';

type Tab = 'posts' | 'about' | 'members';

const TABS: { id: Tab; label: string }[] = [
  { id: 'posts', label: 'Tin đăng' },
  { id: 'about', label: 'Giới thiệu' },
  { id: 'members', label: 'Thành viên' },
];

export default function GroupPage() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const back = useBack();
  const toast = useToast();
  const guarded = useGuarded();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('posts');

  const group = useGroup(id);
  const listings = useGroupListings(id);
  const members = useGroupMembers(id, tab === 'members');
  const setJoined = useSetGroupJoined(id);
  const openChat = useOpenConversation();
  const me = useMe();

  // Ảnh bìa tối: chữ thanh trạng thái phải sáng khi đang ở màn này.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  if (group.isPending) return <Loading />;
  if (group.isError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <IconButton icon="chevron-left" label="Quay lại" onPress={back} />
        <EmptyState icon="users" text={group.error.message} />
      </View>
    );
  }

  const g = group.data;
  const postToGroup = () =>
    guarded(() => {
      // Mở luồng đăng tin với nhóm này đã tích sẵn ở bước 2.
      const { groupIds, toggleGroup } = useDraftStore.getState();
      if (!groupIds.includes(g.id)) toggleGroup(g.id);
      router.push('/post');
    });

  return (
    <ScrollView style={styles.screen}>
      <GroupHeader
        group={g}
        topInset={insets.top}
        onBack={back}
        onShare={() => void Share.share({ message: `Nhóm ${g.name} trên Ghim` })}
        onToggleJoin={() =>
          guarded(() => setJoined.mutate(!g.joined, { onError: (e) => toast(e.message) }))
        }
        onMessageAdmin={() =>
          guarded(() =>
            openChat.mutate(
              { kind: 'group', id: g.id },
              { onSuccess: (cid) => router.push(`/chat/${cid}`), onError: (e) => toast(e.message) },
            ),
          )
        }
      />

      <View style={styles.tabs}>
        <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} />
      </View>

      <View style={styles.body}>
        {tab === 'posts' && (
          <>
            {g.pinnedRule && (
              <View style={styles.pinned}>
                <Feather name="bookmark" size={18} color={C.brand} />
                <View style={styles.flex}>
                  <Text style={styles.pinnedTitle}>Ghim bởi admin · Nội quy nhóm</Text>
                  <Text style={styles.pinnedText}>{g.pinnedRule}</Text>
                </View>
              </View>
            )}
            <Pressable accessibilityRole="button" onPress={postToGroup} style={styles.compose}>
              <Avatar name={me.data?.name ?? 'Bạn'} size={32} tone="brand" />
              <Text style={styles.composeText}>Đăng tin vào nhóm...</Text>
              <Feather name="camera" size={20} color={C.brand} />
            </Pressable>
            {listings.isPending ? (
              <Loading />
            ) : listings.data?.length ? (
              listings.data.map((l) => (
                <ListingRow
                  key={l.id}
                  item={l}
                  by="seller"
                  onPress={() => router.push(`/listing/${l.id}`)}
                />
              ))
            ) : (
              <EmptyState icon="inbox" text="Nhóm chưa có tin nào." />
            )}
          </>
        )}
        {tab === 'about' && <Text style={styles.about}>{g.about}</Text>}
        {tab === 'members' &&
          (members.isPending ? (
            <Loading />
          ) : (
            members.data?.map((m) => (
              <View key={m.id} style={styles.member}>
                <Avatar name={m.name} size={40} />
                <Text style={styles.memberName}>{m.name}</Text>
                {m.verified && <Verified />}
                {m.role === 'admin' && <Tag label="Admin" tone="brand" />}
              </View>
            ))
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  tabs: { marginTop: S.lg, paddingHorizontal: S.lg },
  body: { padding: S.lg, gap: S.md },
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
  about: { fontFamily: F.ui, fontSize: 14, lineHeight: 22, color: C.inkMid },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  memberName: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
});
