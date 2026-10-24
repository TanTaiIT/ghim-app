import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { MenuList, type MenuItem } from '@/components/MenuList';
import { ConfirmSheet, PickerSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, ScreenHeader, Tag, useBack, type IconName } from '@/components/ui';
import {
  useBanMember,
  useDismissModerator,
  useRemoveMember,
  useSetMemberUnit,
  useSetModerator,
  useTransferOwnership,
} from '@/queries/group-manage';
import { useGroupMembers, useGroup } from '@/queries/groups';
import {
  JOINED_VIA_LABEL,
  managerOf,
  memberActionsOf,
  type MemberAction,
} from '@/api/group-manage';
import { GROUP_ROLE_TAG } from '@/api/client';
import { C, F, R, S } from '@/theme';
import { daysUntil, formatDate } from '@/utils/format';

const ACTION: Record<MemberAction, { icon: IconName; label: string }> = {
  unit: { icon: 'grid', label: 'Xếp vào lớp' },
  moderator: { icon: 'shield', label: 'Bổ nhiệm điều hành viên' },
  dismiss: { icon: 'shield-off', label: 'Bãi nhiệm điều hành viên' },
  transfer: { icon: 'key', label: 'Chuyển quyền chủ nhóm' },
  remove: { icon: 'user-minus', label: 'Gỡ khỏi nhóm' },
  ban: { icon: 'slash', label: 'Cấm khỏi nhóm' },
};

/** Giá trị "không lớp" / "cả nhóm" trong bảng chọn — id lớp là uuid nên không trùng. */
const NONE = 'none';

/**
 * Trang một thành viên cho người quản trị: mỗi việc một nút, mỗi nút mở đúng một bảng — không mở bảng này từ bảng kia
 * (iOS hay nuốt Modal mở lúc bảng trước đang đóng). Gỡ và cấm xong thì lùi về danh sách vì người đó không còn ở đây.
 */
export default function GroupMemberPage() {
  const { id = '', accountId = '' } = useLocalSearchParams<{ id: string; accountId: string }>();
  const back = useBack();
  const toast = useToast();
  const group = useGroup(id);
  const viewer = managerOf(group.data);
  const members = useGroupMembers(id, viewer !== null);
  const setUnit = useSetMemberUnit(id);
  const setModerator = useSetModerator(id);
  const dismiss = useDismissModerator(id);
  const transfer = useTransferOwnership(id);
  const remove = useRemoveMember(id);
  const ban = useBanMember(id);
  const [sheet, setSheet] = useState<MemberAction | null>(null);

  const target = members.data?.find((m) => m.id === accountId) ?? null;
  if (group.isPending || (viewer && members.isPending)) return <Loading />;
  if (!viewer || !target) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Thành viên" />
        <EmptyState
          icon="user-x"
          text={members.error?.message ?? group.error?.message ?? 'Người này không còn ở nhóm.'}
        />
      </SafeAreaView>
    );
  }

  const units = viewer.units;
  const unitName = (uid: string | null) => units.find((u) => u.id === uid)?.name ?? null;
  const actions = memberActionsOf(
    { role: viewer.role, moderatorUnitId: viewer.moderatorUnitId, hasUnits: units.length > 0 },
    target,
  );
  const items: MenuItem[] = actions.map((a) => ({ ...ACTION[a], onPress: () => setSheet(a) }));
  const roleTag = GROUP_ROLE_TAG[target.role];
  const fail = (e: Error) => toast(e.message);
  const gone = (message: string) => {
    toast(message);
    back();
  };
  const roleLine =
    target.role === 'moderator'
      ? target.moderatorUnitId
        ? `Điều hành viên của ${unitName(target.moderatorUnitId) ?? 'một lớp'}`
        : 'Điều hành viên cả nhóm'
      : target.role === 'owner'
        ? 'Chủ nhóm'
        : 'Thành viên';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Thành viên" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Avatar name={target.name} size={56} />
          <View style={styles.body}>
            <Text style={styles.name}>{target.name}</Text>
            <Text style={styles.meta}>{roleLine}</Text>
            {units.length > 0 && (
              <Text style={styles.meta}>Lớp: {unitName(target.unitId) ?? 'chưa xếp'}</Text>
            )}
            <Text style={styles.meta}>
              Vào nhóm {formatDate(target.joinedAt)} · đường vào:{' '}
              {JOINED_VIA_LABEL[target.joinedVia]}
            </Text>
          </View>
          {roleTag && <Tag label={roleTag} tone="brand" />}
        </View>
        {items.length ? (
          <MenuList items={items} />
        ) : (
          <Text style={styles.meta}>Bạn không xử được gì trên người này.</Text>
        )}
      </ScrollView>

      <PickerSheet
        visible={sheet === 'unit'}
        title={`Xếp ${target.name} vào lớp`}
        options={[
          { value: NONE, label: 'Không thuộc lớp nào' },
          ...units.map((u) => ({ value: u.id, label: u.name })),
        ]}
        value={target.unitId ?? NONE}
        onSelect={(v) =>
          setUnit.mutate(
            { accountId, unitId: v === NONE ? null : v },
            { onSuccess: () => toast('Đã xếp lớp'), onError: fail },
          )
        }
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'moderator'}
        title={`${target.name} điều hành phạm vi nào?`}
        options={[
          {
            value: NONE,
            label: 'Cả nhóm',
            note: 'Duyệt đơn, mời, gỡ, cấm, xếp lớp mọi thành viên.',
          },
          ...units.map((u) => ({
            value: u.id,
            label: `Lớp ${u.name}`,
            note: 'Chỉ mời, gỡ, cấm thành viên trong lớp này.',
          })),
        ]}
        value={null}
        onSelect={(v) =>
          setModerator.mutate(
            { accountId, unitId: v === NONE ? null : v },
            { onSuccess: () => toast(`${target.name} là điều hành viên`), onError: fail },
          )
        }
        onClose={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={sheet === 'dismiss'}
        title={`Bãi nhiệm ${target.name}?`}
        confirmLabel="Bãi nhiệm"
        note="Vẫn là thành viên, không còn quyền điều hành"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          dismiss.mutate({ accountId }, { onSuccess: () => toast('Đã bãi nhiệm'), onError: fail })
        }
      />
      <ConfirmSheet
        visible={sheet === 'transfer'}
        title={`Chuyển quyền chủ nhóm cho ${target.name}?`}
        confirmLabel="Gửi lời chuyển"
        note="Bạn vẫn là chủ tới khi người nhận đồng ý; nhận xong bạn là thành viên thường"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          transfer.mutate(
            { accountId },
            {
              onSuccess: ({ expiresAt }) =>
                toast(`Đã gửi lời chuyển — ${target.name} có ${daysUntil(expiresAt)} ngày để nhận`),
              onError: fail,
            },
          )
        }
      />
      <ConfirmSheet
        visible={sheet === 'remove'}
        title={`Gỡ ${target.name} khỏi nhóm?`}
        confirmLabel="Gỡ khỏi nhóm"
        note="Vào lại như người mới theo cách vào hiện tại của nhóm"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          remove.mutate(
            { accountId },
            { onSuccess: () => gone(`Đã gỡ ${target.name} khỏi nhóm`), onError: fail },
          )
        }
      />
      <ConfirmSheet
        visible={sheet === 'ban'}
        title={`Cấm ${target.name} khỏi nhóm?`}
        confirmLabel="Cấm"
        note="Mất tư cách thành viên ngay; chỉ có tác dụng trong nhóm này — gỡ cấm ở Người bị cấm"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          ban.mutate(
            { accountId },
            { onSuccess: () => gone(`Đã cấm ${target.name}`), onError: fail },
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  body: { flex: 1, gap: 2 },
  name: { fontFamily: F.uiBold, fontSize: 17, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
});
