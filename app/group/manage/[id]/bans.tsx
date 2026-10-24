import { FlatList, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MemberRow } from '@/components/MemberRow';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, OutlineButton, ScreenHeader } from '@/components/ui';
import { useBans, useUnban } from '@/queries/group-manage';
import { C, S } from '@/theme';
import { formatDate } from '@/utils/format';

/** Người đang bị cấm khỏi nhóm; gỡ cấm thì vào lại như người mới theo cách vào hiện tại (spec membership). */
export default function GroupBans() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const bans = useBans(id);
  const unban = useUnban(id);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Người bị cấm" />
      <FlatList
        data={bans.data?.items ?? []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.content}
        onRefresh={() => void bans.refetch()}
        refreshing={bans.isRefetching}
        renderItem={({ item }) => (
          <MemberRow name={item.name} meta={`Cấm ngày ${formatDate(item.bannedAt)}`}>
            <OutlineButton
              compact
              label="Gỡ cấm"
              onPress={() =>
                !unban.isPending &&
                unban.mutate(
                  { accountId: item.id },
                  {
                    onSuccess: () => toast(`Đã gỡ cấm ${item.name}`),
                    onError: (e) => toast(e.message),
                  },
                )
              }
            />
          </MemberRow>
        )}
        ListEmptyComponent={
          bans.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              icon={bans.isError ? 'lock' : 'slash'}
              text={bans.error?.message ?? 'Không ai đang bị cấm khỏi nhóm.'}
            />
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
