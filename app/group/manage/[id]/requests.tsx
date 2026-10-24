import { FlatList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MemberRow } from '@/components/MemberRow';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, OutlineButton, PinButton, ScreenHeader } from '@/components/ui';
import { useDecideJoinRequest, useJoinRequests } from '@/queries/group-manage';
import type { PendingJoinRequest } from '@/api/group-manage';
import { C, S } from '@/theme';
import { daysUntil, formatAgo } from '@/utils/format';

/**
 * Đơn xin vào đang chờ (nhóm xét duyệt, nhóm có mã). Một đơn đang xử thì khoá cả hai nút của mọi dòng: bấm dồn hai đơn
 * là hai lượt ghi chồng nhau mà toast chỉ kịp nói về một.
 */
export default function JoinRequests() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const requests = useJoinRequests(id, true);
  const decide = useDecideJoinRequest();

  const act = (r: PendingJoinRequest, approve: boolean) =>
    decide.mutate(
      { id: r.id, approve },
      {
        onSuccess: () => toast(approve ? `${r.name} đã vào nhóm` : `Đã từ chối đơn của ${r.name}`),
        onError: (e) => toast(e.message),
      },
    );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Đơn xin vào" />
      <FlatList
        data={requests.data?.items ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        onRefresh={() => void requests.refetch()}
        refreshing={requests.isRefetching}
        renderItem={({ item }) => (
          <MemberRow
            name={item.name}
            meta={`${formatAgo(item.createdAt)} · tự huỷ sau ${daysUntil(item.expiresAt)} ngày nếu chưa ai xử`}
          >
            <View style={styles.actions}>
              <View style={styles.flex}>
                <PinButton
                  compact
                  label="Duyệt"
                  disabled={decide.isPending}
                  onPress={() => act(item, true)}
                />
              </View>
              <OutlineButton
                compact
                label="Từ chối"
                onPress={() => !decide.isPending && act(item, false)}
              />
            </View>
          </MemberRow>
        )}
        ListEmptyComponent={
          requests.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              icon={requests.isError ? 'lock' : 'inbox'}
              text={requests.error?.message ?? 'Không có đơn nào đang chờ.'}
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
  actions: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  flex: { flex: 1 },
});
