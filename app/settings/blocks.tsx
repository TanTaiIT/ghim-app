import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionRow } from '@/components/ActionRow';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { useBlocks, useUnblock } from '@/queries/settings';
import { C, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/** Người đã chặn. Gỡ chặn không báo cho ai, hội thoại cũ nhận tin lại được. */
export default function Blocks() {
  const toast = useToast();
  const blocks = useBlocks();
  const unblock = useUnblock();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Người đã chặn" />
      <FlatList
        data={blocks.data ?? []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <ActionRow
            icon="user-x"
            title={item.name ?? 'Tài khoản đã xoá'}
            meta={`Chặn ${formatAgo(item.blockedAt)}`}
            action={{
              label: 'Bỏ chặn',
              onPress: () =>
                unblock.mutate(item.id, {
                  onSuccess: () => toast('Đã bỏ chặn'),
                  onError: (e) => toast(e.message),
                }),
            }}
          />
        )}
        ListEmptyComponent={
          blocks.isPending ? (
            <Loading />
          ) : (
            <EmptyState icon="slash" text={blocks.error?.message ?? 'Bạn chưa chặn ai.'} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.sm },
});
