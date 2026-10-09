import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuestGate } from '@/components/GuestGate';
import { NoticeCard } from '@/components/NoticeCard';
import { UnderlineTabs } from '@/components/TabStrip';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading } from '@/components/ui';
import { useMarkAllNoticesRead, useNotices } from '@/queries/account';
import type { NoticeTab, NoticeTarget } from '@/api/client';
import { useIsAuthenticated } from '@/stores/auth';
import { C, F, S } from '@/theme';

const TABS: { id: NoticeTab; label: string }[] = [
  { id: 'deal', label: 'Giao dịch' },
  { id: 'promo', label: 'Khuyến mãi' },
  { id: 'system', label: 'Hệ thống' },
];

export default function Notifications() {
  const router = useRouter();
  const toast = useToast();
  const authed = useIsAuthenticated();
  const [tab, setTab] = useState<NoticeTab>('deal');
  const notices = useNotices();
  const markAll = useMarkAllNoticesRead();
  const items = notices.data?.filter((n) => n.tab === tab) ?? [];

  const open = (t: NoticeTarget) => {
    switch (t.screen) {
      case 'chat':
        return router.push(`/chat/${t.id}`);
      case 'search':
        return router.push({ pathname: '/search', params: { q: t.q } });
      case 'profile':
        return router.navigate('/(tabs)/profile');
      case 'listing':
        return router.push(`/listing/${t.id}`);
      case 'group':
        return router.push(`/group/${t.id}`);
      case 'post':
        return router.push('/post');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Thông báo</Text>
          {authed && (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => markAll.mutate(undefined, { onError: (e) => toast(e.message) })}
            >
              <Text style={styles.readAll}>Đọc tất cả</Text>
            </Pressable>
          )}
        </View>
        {authed && <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} />}
      </View>

      {!authed ? (
        <GuestGate
          icon="bell"
          text="Đăng nhập để nhận đề xuất giá, tin mới khớp tìm kiếm và nhắc hạn tin."
        />
      ) : notices.isPending ? (
        <Loading />
      ) : notices.isError ? (
        <EmptyState icon="wifi-off" text={notices.error.message} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          refreshing={notices.isRefetching}
          onRefresh={() => void notices.refetch()}
          ListEmptyComponent={
            <EmptyState
              icon="bell"
              title="Chưa có thông báo"
              text="Thông báo mới sẽ xuất hiện ở đây."
            />
          }
          renderItem={({ item }) => <NoticeCard notice={item} onPress={() => open(item.target)} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  header: {
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
    gap: S.sm,
    backgroundColor: C.paperWarm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  title: { fontFamily: F.uiBlack, fontSize: 24, color: C.ink },
  readAll: { fontFamily: F.uiBold, fontSize: 14, color: C.brandTx },
  list: { flexGrow: 1, paddingVertical: S.md, paddingHorizontal: S.lg, gap: 10 },
});
