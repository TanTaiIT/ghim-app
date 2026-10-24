import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuList, type MenuItem } from '@/components/MenuList';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, OutlineButton, ScreenHeader, SectionTitle } from '@/components/ui';
import { useJoinRequests, useRotateGroupCode } from '@/queries/group-manage';
import { useGroup } from '@/queries/groups';
import type { Group } from '@/api/client';
import { C, F, R, S } from '@/theme';
import { groupThousands } from '@/utils/format';

type Manager = Extract<Group, { visible: true }> & { role: 'owner' | 'moderator' };

/** Người xem có vai quản trị không — server kiểm lại ở từng lượt, đây chỉ để giấu lối vào. */
const managerOf = (g: Group | undefined): Manager | null =>
  g?.visible && (g.role === 'owner' || g.role === 'moderator') ? { ...g, role: g.role } : null;

/** Điều hành viên có `moderatorUnitId` chỉ xử việc trong lớp đó (spec group-roles) — nói rõ để khỏi bấm rồi nhận 403. */
function roleNoteOf(g: Manager): string {
  if (g.role === 'owner') return 'Bạn là chủ nhóm.';
  if (g.moderatorUnitId === null) return 'Bạn là điều hành viên cả nhóm.';
  const unit = g.units.find((u) => u.id === g.moderatorUnitId)?.name ?? 'một lớp';
  return `Bạn là điều hành viên của ${unit}: chỉ mời và xử việc trong lớp này.`;
}

/**
 * Khu quản trị nhóm: lối vào từng việc theo vai. Đổi mã là lượt ghi duy nhất ở đây — hỏi lại trước vì mã cũ hết hiệu
 * lực ngay với người đang cầm nó.
 */
export default function GroupManage() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const group = useGroup(id);
  const manager = managerOf(group.data);
  const wholeManager =
    manager !== null && (manager.role === 'owner' || manager.moderatorUnitId === null);
  const requests = useJoinRequests(id, wholeManager);
  const rotate = useRotateGroupCode(id);
  const [confirm, setConfirm] = useState(false);

  if (group.isPending) return <Loading />;
  if (!manager) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Quản trị nhóm" />
        <EmptyState
          icon="lock"
          text={group.error?.message ?? 'Bạn không có vai quản trị trong nhóm này.'}
        />
      </SafeAreaView>
    );
  }

  const pending = requests.data?.total ?? 0;
  const items: MenuItem[] = [
    ...(wholeManager
      ? [
          {
            icon: 'user-plus' as const,
            label: pending ? `Đơn xin vào · ${pending}` : 'Đơn xin vào',
            onPress: () => router.push(`/group/manage/${id}/requests`),
          },
        ]
      : []),
    { icon: 'mail', label: 'Lời mời', onPress: () => router.push(`/group/manage/${id}/invites`) },
  ];
  const ownsCode = manager.role === 'owner' && manager.mode === 'private_code';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Quản trị nhóm" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.name}>{manager.name}</Text>
          <Text style={styles.meta}>{groupThousands(manager.memberCount)} thành viên</Text>
          <Text style={styles.meta}>{roleNoteOf(manager)}</Text>
        </View>
        <MenuList items={items} />
        {ownsCode && (
          <>
            <SectionTitle title="Mã nhóm" />
            <View style={styles.card}>
              <Text style={styles.code}>{manager.code ?? '······'}</Text>
              <Text style={styles.meta}>
                Người có mã mới gửi được đơn xin vào. Mã bị lộ thì đổi — mã cũ hết hiệu lực ngay.
              </Text>
              <OutlineButton compact label="Đổi mã" onPress={() => setConfirm(true)} />
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmSheet
        visible={confirm}
        title="Đổi mã nhóm?"
        confirmLabel="Đổi mã"
        note="Mã cũ hết hiệu lực ngay; bạn gửi mã mới cho người cần vào"
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          rotate.mutate(undefined, {
            onSuccess: (code) => toast(`Mã mới: ${code}`),
            onError: (e) => toast(e.message),
          })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  card: {
    gap: S.sm,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  name: { fontFamily: F.uiBold, fontSize: 17, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  code: { fontFamily: F.uiBlack, fontSize: 28, letterSpacing: 4, color: C.brandDark },
});
