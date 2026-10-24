import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionRow } from '@/components/ActionRow';
import { Chip } from '@/components/Chip';
import { InputSheet } from '@/components/InputSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, IconButton, Loading, ScreenHeader } from '@/components/ui';
import { useInvite, usePendingInvitations, useRevokeInvitation } from '@/queries/group-manage';
import { useGroup } from '@/queries/groups';
import { isWholeManager, managerOf } from '@/api/group-manage';
import { C, F, S } from '@/theme';
import { daysUntil, formatAgo } from '@/utils/format';

/**
 * Lời mời đang chờ của nhóm và ô mời bằng email. Chọn lớp bằng chip trên màn rồi mới mở bảng gõ email: một bảng một
 * việc, không mở bảng chọn lớp ngay lúc bảng email đang đóng (iOS hay nuốt Modal mở lúc đó). Điều hành viên lớp không
 * có hàng chip — server tự gắn lớp của họ.
 */
export default function GroupInvites() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const group = useGroup(id);
  const invitations = usePendingInvitations(id);
  const invite = useInvite(id);
  const revoke = useRevokeInvitation(id);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const g = managerOf(group.data);
  const units = g?.units ?? [];
  const canPickUnit = g !== null && units.length > 0 && isWholeManager(g);
  const unitNameOf = (uid: string | null) =>
    uid === null ? 'Cả nhóm' : (units.find((u) => u.id === uid)?.name ?? 'Một lớp');
  const fail = (e: Error) => toast(e.message);

  const send = (email: string) =>
    invite.mutate(
      { email, unitId: canPickUnit ? unitId : null },
      {
        onSuccess: () => {
          setComposing(false);
          toast(
            'Đã ghi lời mời. Email này có tài khoản thì người đó thấy lời mời ở "Nhóm của tôi".',
          );
        },
        onError: fail,
      },
    );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader
        title="Lời mời"
        right={
          <IconButton icon="user-plus" label="Mời bằng email" onPress={() => setComposing(true)} />
        }
      />
      {canPickUnit && (
        <View style={styles.units}>
          <Text style={styles.unitsLabel}>Mời vào</Text>
          <Chip label="Cả nhóm" selected={unitId === null} onPress={() => setUnitId(null)} />
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
        data={invitations.data?.items ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.content}
        onRefresh={() => void invitations.refetch()}
        refreshing={invitations.isRefetching}
        renderItem={({ item }) => (
          <ActionRow
            icon="mail"
            title={item.emailHint}
            meta={`${unitNameOf(item.unitId)} · ${formatAgo(item.createdAt)} · còn ${daysUntil(item.expiresAt)} ngày`}
            action={{
              label: 'Thu hồi',
              onPress: () =>
                revoke.mutate(item.id, {
                  onSuccess: () => toast('Đã thu hồi lời mời'),
                  onError: fail,
                }),
            }}
          />
        )}
        ListEmptyComponent={
          invitations.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              icon={invitations.isError ? 'lock' : 'mail'}
              text={invitations.error?.message ?? 'Chưa có lời mời nào đang chờ.'}
            />
          )
        }
      />

      <InputSheet
        visible={composing}
        title={canPickUnit && unitId ? `Mời vào ${unitNameOf(unitId)}` : 'Mời bằng email'}
        note='Người được mời thấy lời mời ở "Nhóm của tôi". Email nào cũng nhận một câu trả lời như nhau — ứng dụng không cho biết email đó đã có tài khoản hay chưa.'
        label="Email của người được mời"
        placeholder="ten@truong.vn"
        confirmLabel="Gửi lời mời"
        minLength={5}
        busy={invite.isPending}
        inputProps={{ keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false }}
        onClose={() => setComposing(false)}
        onSubmit={send}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.sm },
  units: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: S.sm,
    paddingHorizontal: S.lg,
    paddingBottom: S.xs,
  },
  unitsLabel: { fontFamily: F.uiMedium, fontSize: 13, color: C.inkSoft },
});
