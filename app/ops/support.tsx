import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { OpsHeader } from '@/components/OpsHeader';
import { SegmentedTabs } from '@/components/TabStrip';
import { EmptyState, Loading } from '@/components/ui';
import { useSupportQueue } from '@/queries/ops-support';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

type Tab = 'pending' | 'all';

/** Hàng hỗ trợ chung của cả đội (staff có quyền `support`, master), chờ lâu nhất trước. */
export default function OpsSupport() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pending');
  const queue = useSupportQueue(tab === 'pending');

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title="Hỗ trợ người dùng"
        sub={queue.data ? `${queue.data.total} hội thoại` : undefined}
      >
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'pending', label: 'Đang chờ đội' },
            { id: 'all', label: 'Tất cả' },
          ]}
        />
      </OpsHeader>
      {queue.isPending ? (
        <Loading />
      ) : queue.isError ? (
        <EmptyState icon="lock" text={queue.error.message} />
      ) : (
        <FlatList
          data={queue.data.items}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          onRefresh={() => void queue.refetch()}
          refreshing={queue.isRefetching}
          ListEmptyComponent={
            <EmptyState icon="inbox" text="Không có hội thoại nào đang chờ đội trả lời." />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/ops/thread/${item.id}`)}
              style={styles.row}
            >
              <Avatar name={item.personName} size={44} />
              <View style={styles.body}>
                <View style={styles.head}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.personName}
                  </Text>
                  <Text style={styles.time}>{formatAgo(item.lastAt, undefined, true)}</Text>
                </View>
                <Text style={[styles.last, item.unread > 0 && styles.unread]} numberOfLines={2}>
                  {item.lastMessage ?? 'Chưa có tin nhắn'}
                </Text>
              </View>
              {item.unread > 0 && (
                <View style={styles.count}>
                  <Text style={styles.countText}>{item.unread}</Text>
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  list: { padding: S.lg, gap: S.sm },
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
  body: { flex: 1, minWidth: 0, gap: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  name: { flex: 1, fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  time: { fontFamily: F.ui, fontSize: 12, color: C.muted },
  last: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  unread: { fontFamily: F.uiSemi, color: C.ink },
  count: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: R.full,
    backgroundColor: C.price,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: F.uiBold, fontSize: 11, color: C.paperWarm },
});
