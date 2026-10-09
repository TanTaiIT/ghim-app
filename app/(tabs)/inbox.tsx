import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuestGate } from '@/components/GuestGate';
import { Photo } from '@/components/Photo';
import { Avatar, Verified } from '@/components/Avatar';
import { EmptyState, Loading } from '@/components/ui';
import { useConversations } from '@/queries/messages';
import { useIsAuthenticated } from '@/stores/auth';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/**
 * Hộp thư. Bộ UI gốc không vẽ màn này (nút Tin nhắn nhảy thẳng vào một cuộc chat); danh sách dùng lại
 * thẻ, avatar và chữ của các màn có sẵn để không lạc tông.
 */
export default function Inbox() {
  const router = useRouter();
  const authed = useIsAuthenticated();
  const conversations = useConversations();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.title}>Tin nhắn</Text>
      {!authed ? (
        <GuestGate icon="message-circle" text="Đăng nhập để nhắn tin với người bán và trả giá." />
      ) : conversations.isPending ? (
        <Loading />
      ) : conversations.isError ? (
        <EmptyState icon="wifi-off" text={conversations.error.message} />
      ) : (
        <FlatList
          data={conversations.data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshing={conversations.isRefetching}
          onRefresh={() => void conversations.refetch()}
          ListEmptyComponent={
            <EmptyState
              icon="message-circle"
              title="Chưa có tin nhắn"
              text="Bấm “Chat ngay” ở một tin đăng để bắt đầu."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push(`/chat/${item.id}`)}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Avatar name={item.peer.name} size={48} tone="solid" />
              <View style={styles.body}>
                <View style={styles.line}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.peer.name}
                  </Text>
                  {item.peer.verified && <Verified size={14} />}
                  <Text style={styles.time}>{formatAgo(item.at, undefined, true)}</Text>
                </View>
                <Text
                  style={[styles.preview, item.unread > 0 && styles.previewUnread]}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
                {item.listing && (
                  <Text style={styles.listing} numberOfLines={1}>
                    {item.listing.title}
                  </Text>
                )}
              </View>
              {item.listing && <Photo picture={item.listing.cover} style={styles.thumb} />}
              {item.unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unread}</Text>
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  title: {
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
    paddingBottom: S.md,
    fontFamily: F.uiBlack,
    fontSize: 24,
    color: C.ink,
  },
  list: { flexGrow: 1, paddingHorizontal: S.lg, paddingBottom: S.lg, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  body: { flex: 1, minWidth: 0, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  time: { marginLeft: 'auto', fontFamily: F.ui, fontSize: 12, color: C.muted },
  preview: { fontFamily: F.ui, fontSize: 13, color: C.inkSoft },
  previewUnread: { fontFamily: F.uiSemi, color: C.ink },
  listing: { fontFamily: F.ui, fontSize: 12, color: C.muted },
  thumb: { width: 44, height: 44, borderRadius: R.sm },
  badge: {
    position: 'absolute',
    top: S.sm,
    left: 44,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: R.full,
    backgroundColor: C.price,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: F.uiBold, fontSize: 10, color: C.paperWarm },
});
