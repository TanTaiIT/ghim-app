import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarButton } from '@/components/ActionBar';
import { MenuList, type MenuItem } from '@/components/MenuList';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, OutlineButton, ScreenHeader, SectionTitle } from '@/components/ui';
import {
  useCancelOwnerTransfer,
  useCloseGroup,
  useGroupReviewTasks,
  useJoinRequests,
  useRotateGroupCode,
} from '@/queries/group-manage';
import { useGroup } from '@/queries/groups';
import { isWholeManager, managerOf, type ManagedGroup } from '@/api/group-manage';
import type { GroupKind } from '@/api/client';
import { C, F, R, S } from '@/theme';
import { groupThousands } from '@/utils/format';

/** Trường học và công ty mới có lớp / phòng ban (spec membership "Đơn vị con"). */
const UNIT_KINDS = new Set<GroupKind>(['school', 'company']);

/** Điều hành viên có `moderatorUnitId` chỉ xử việc trong lớp đó (spec group-roles) — nói rõ để khỏi bấm rồi nhận 403. */
function roleNoteOf(g: ManagedGroup): string {
  if (g.role === 'owner') return 'Bạn là chủ nhóm.';
  if (g.moderatorUnitId === null) return 'Bạn là điều hành viên cả nhóm.';
  const unit = g.units.find((u) => u.id === g.moderatorUnitId)?.name ?? 'một lớp';
  return `Bạn là điều hành viên của ${unit}: chỉ mời và xử việc trong lớp này.`;
}

type Sheet = 'code' | 'cancel-transfer' | 'close' | null;
type Sub =
  | 'review'
  | 'listings'
  | 'requests'
  | 'invites'
  | 'members'
  | 'bans'
  | 'roster'
  | 'units'
  | 'announce'
  | 'settings';

/**
 * Khu quản trị nhóm: lối vào từng việc theo vai. Ba lượt ghi ở đây đều hỏi lại: đổi mã làm mã cũ chết ngay với người
 * đang cầm, huỷ lời chuyển chủ lấy lại điều đã hứa, đóng nhóm thì không mở lại được.
 */
export default function GroupManage() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const group = useGroup(id);
  const manager = managerOf(group.data);
  const whole = manager !== null && isWholeManager(manager);
  const requests = useJoinRequests(id, whole);
  const review = useGroupReviewTasks(id, manager !== null);
  const rotate = useRotateGroupCode(id);
  const cancelTransfer = useCancelOwnerTransfer(id);
  const close = useCloseGroup(id);
  const [sheet, setSheet] = useState<Sheet>(null);

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

  const owner = manager.role === 'owner';
  const pending = requests.data?.total ?? 0;
  const waiting = review.data?.total ?? 0;
  const go = (sub: Sub) => router.push(`/group/manage/${id}/${sub}`);
  const items: MenuItem[] = [
    {
      icon: 'check-square',
      label: waiting ? `Hàng chờ duyệt · ${waiting}` : 'Hàng chờ duyệt',
      onPress: () => go('review'),
    },
    { icon: 'tag', label: 'Tin trong nhóm', onPress: () => go('listings') },
    ...(whole
      ? [
          {
            icon: 'user-plus' as const,
            label: pending ? `Đơn xin vào · ${pending}` : 'Đơn xin vào',
            onPress: () => go('requests'),
          },
        ]
      : []),
    { icon: 'mail', label: 'Lời mời', onPress: () => go('invites') },
    {
      icon: 'users',
      label: `Thành viên · ${groupThousands(manager.memberCount)}`,
      onPress: () => go('members'),
    },
    ...(whole
      ? [
          { icon: 'slash' as const, label: 'Người bị cấm', onPress: () => go('bans') },
          { icon: 'list' as const, label: 'Danh sách lớp', onPress: () => go('roster') },
        ]
      : []),
    ...(owner && UNIT_KINDS.has(manager.kind)
      ? [
          {
            icon: 'grid' as const,
            label: `Lớp · ${manager.units.length}`,
            onPress: () => go('units'),
          },
        ]
      : []),
    { icon: 'bell', label: 'Đăng thông báo', onPress: () => go('announce') },
    ...(owner
      ? [{ icon: 'sliders' as const, label: 'Cài đặt nhóm', onPress: () => go('settings') }]
      : []),
  ];
  const fail = (e: Error) => toast(e.message);

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
        {owner && manager.mode === 'private_code' && (
          <>
            <SectionTitle title="Mã nhóm" />
            <View style={styles.card}>
              <Text style={styles.code}>{manager.code ?? '······'}</Text>
              <Text style={styles.meta}>
                Người có mã mới gửi được đơn xin vào. Mã bị lộ thì đổi — mã cũ hết hiệu lực ngay.
              </Text>
              <OutlineButton compact label="Đổi mã" onPress={() => setSheet('code')} />
            </View>
          </>
        )}
        {owner && (
          <>
            <SectionTitle title="Chủ nhóm" />
            <View style={styles.card}>
              <Text style={styles.meta}>
                Chuyển quyền chủ nhóm từ trang của một thành viên (Thành viên → chọn người). Lời
                chuyển đang chờ huỷ được ở đây.
              </Text>
              <OutlineButton
                compact
                label="Huỷ lời chuyển chủ đang chờ"
                onPress={() => setSheet('cancel-transfer')}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.meta}>
                Đóng nhóm là vĩnh viễn: đơn, lời mời, mã nhóm huỷ ngay; tin trong nhóm không còn
                hiện với ai.
              </Text>
              <BarButton
                tone="dangerSoft"
                fit
                label="Đóng nhóm"
                onPress={() => setSheet('close')}
              />
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmSheet
        visible={sheet === 'code'}
        title="Đổi mã nhóm?"
        confirmLabel="Đổi mã"
        note="Mã cũ hết hiệu lực ngay; bạn gửi mã mới cho người cần vào"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          rotate.mutate(undefined, { onSuccess: (code) => toast(`Mã mới: ${code}`), onError: fail })
        }
      />
      <ConfirmSheet
        visible={sheet === 'cancel-transfer'}
        title="Huỷ lời chuyển chủ đang chờ?"
        confirmLabel="Huỷ lời chuyển"
        note="Người được chuyển không nhận được nữa; bạn vẫn là chủ nhóm"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          cancelTransfer.mutate(undefined, {
            onSuccess: () => toast('Đã huỷ lời chuyển chủ'),
            onError: fail,
          })
        }
      />
      <ConfirmSheet
        visible={sheet === 'close'}
        title={`Đóng ${manager.name}?`}
        confirmLabel="Đóng nhóm vĩnh viễn"
        note="Không mở lại được — tin trong nhóm không còn hiện với ai"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          close.mutate(undefined, {
            onSuccess: () => {
              toast(`Đã đóng nhóm ${manager.name}`);
              router.replace('/groups');
            },
            onError: fail,
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
