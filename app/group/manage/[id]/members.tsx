import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '@/components/Chip';
import { MemberRow } from '@/components/MemberRow';
import { EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { useGroupMembers, useGroup } from '@/queries/groups';
import { managerOf, memberActionsOf } from '@/api/group-manage';
import { GROUP_ROLE_TAG, type GroupMember } from '@/api/client';
import { C, S } from '@/theme';
import { formatDate } from '@/utils/format';

/**
 * Danh sách thành viên cho chủ nhóm và điều hành viên; lọc theo lớp khi nhóm có lớp. Dòng chỉ mở được trang của người
 * mà người xem xử được gì đó — chủ nhóm, điều hành viên khác (với điều hành viên) thì chỉ để xem.
 */
export default function GroupMembers() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const group = useGroup(id);
  const viewer = managerOf(group.data);
  const members = useGroupMembers(id, viewer !== null);
  const [unitId, setUnitId] = useState<string | null>(null);

  const units = viewer?.units ?? [];
  const unitName = (uid: string | null) => units.find((u) => u.id === uid)?.name ?? null;
  const metaOf = (m: GroupMember) =>
    [
      unitName(m.unitId),
      m.role === 'moderator'
        ? m.moderatorUnitId
          ? `điều hành ${unitName(m.moderatorUnitId) ?? 'một lớp'}`
          : 'điều hành cả nhóm'
        : null,
      `vào ${formatDate(m.joinedAt)}`,
    ]
      .filter(Boolean)
      .join(' · ');
  const canOpen = (m: GroupMember) =>
    viewer !== null &&
    memberActionsOf(
      { role: viewer.role, moderatorUnitId: viewer.moderatorUnitId, hasUnits: units.length > 0 },
      m,
    ).length > 0;
  const list = (members.data ?? []).filter((m) => unitId === null || m.unitId === unitId);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Thành viên" />
      {units.length > 0 && (
        <View style={styles.filters}>
          <Chip label="Tất cả" selected={unitId === null} onPress={() => setUnitId(null)} />
          {units.map((u) => (
            <Chip
              key={u.id}
              label={u.name}
              selected={unitId === u.id}
              onPress={() => setUnitId(u.id)}
            />
          ))}
        </View>
      )}
      <FlatList
        data={list}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.content}
        onRefresh={() => void members.refetch()}
        refreshing={members.isRefetching}
        renderItem={({ item }) => (
          <MemberRow
            name={item.name}
            meta={metaOf(item)}
            tag={GROUP_ROLE_TAG[item.role]}
            onPress={
              canOpen(item) ? () => router.push(`/group/manage/${id}/member/${item.id}`) : undefined
            }
          />
        )}
        ListEmptyComponent={
          group.isPending || members.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              icon={members.isError || !viewer ? 'lock' : 'users'}
              text={
                members.error?.message ??
                (viewer ? 'Chưa có ai trong lớp này.' : 'Bạn không có vai quản trị trong nhóm này.')
              }
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
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.sm,
    paddingHorizontal: S.lg,
    paddingBottom: S.xs,
  },
});
