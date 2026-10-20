import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionRow } from '@/components/ActionRow';
import { useToast } from '@/components/Toast';
import { EmptyState, GhostButton, Loading, ScreenHeader } from '@/components/ui';
import { useRevokeSession, useSessions } from '@/queries/settings';
import { C, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/** Thiết bị đang đăng nhập. Máy này không có nút đăng xuất ở đây — đó là nút Đăng xuất của trang Cá nhân. */
export default function Sessions() {
  const toast = useToast();
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const run = (id: string | 'others', done: string) =>
    revoke.mutate(id, { onSuccess: () => toast(done), onError: (e) => toast(e.message) });
  const others = sessions.data?.filter((s) => !s.current).length ?? 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Thiết bị đăng nhập" />
      <FlatList
        data={sessions.data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <ActionRow
            icon="smartphone"
            title={item.deviceName}
            meta={item.current ? 'Máy này' : `Hoạt động ${formatAgo(item.lastActiveAt)}`}
            action={
              item.current
                ? null
                : { label: 'Đăng xuất', onPress: () => run(item.id, 'Đã đăng xuất thiết bị') }
            }
          />
        )}
        ListEmptyComponent={
          sessions.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              icon="smartphone"
              text={sessions.error?.message ?? 'Không có thiết bị nào.'}
            />
          )
        }
        ListFooterComponent={
          others > 1 ? (
            <GhostButton
              label="Đăng xuất mọi thiết bị khác"
              onPress={() => run('others', 'Đã đăng xuất mọi thiết bị khác')}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.sm },
});
