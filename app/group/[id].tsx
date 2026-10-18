import { useCallback, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { actionOf, GroupActions } from '@/components/GroupActions';
import { GroupBoard, type GroupTab } from '@/components/GroupBoard';
import { GroupCodeSheet } from '@/components/GroupCodeSheet';
import { GroupHeader } from '@/components/GroupHeader';
import { useGuarded } from '@/components/GuestGate';
import { PickerSheet } from '@/components/PickerSheet';
import { UnderlineTabs } from '@/components/TabStrip';
import { useToast } from '@/components/Toast';
import { EmptyState, IconButton, Loading, useBack } from '@/components/ui';
import {
  useAnswerInvitation,
  useGroup,
  useGroupInvites,
  useJoinGroup,
  useLeaveGroup,
  useMutedGroups,
  useSetGroupMuted,
  useWithdrawJoinRequest,
} from '@/queries/groups';
import { useOpenConversation } from '@/queries/messages';
import { isPublicGroup, type GroupMode, type JoinOutcome, type Placement } from '@/api/client';
import { C, S } from '@/theme';

const TABS: { id: GroupTab; label: string }[] = [
  { id: 'posts', label: 'Tin đăng' },
  { id: 'about', label: 'Giới thiệu' },
];
/** Chỉ chủ nhóm và điều hành viên đọc được danh sách thành viên (spec membership). */
const MANAGER_TABS = [...TABS, { id: 'members' as const, label: 'Thành viên' }];

const REJOIN_NOTE: Record<GroupMode, string> = {
  public_open: 'Vào lại bằng nút Tham gia lúc nào cũng được.',
  public_review: 'Muốn vào lại phải gửi đơn và chờ duyệt.',
  private_code: 'Muốn vào lại phải nhập mã, gửi đơn và chờ duyệt.',
  private_invite: 'Muốn vào lại phải có lời mời mới.',
};

type MenuChoice = 'mute' | 'leave';

export default function GroupPage() {
  const { id = '', code } = useLocalSearchParams<{ id: string; code?: string }>();
  const router = useRouter();
  const back = useBack();
  const toast = useToast();
  const guarded = useGuarded();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<GroupTab>('posts');
  const [sheet, setSheet] = useState<'code' | 'menu' | null>(null);

  const group = useGroup(id);
  const invites = useGroupInvites();
  const muted = useMutedGroups();
  const join = useJoinGroup(id);
  const withdraw = useWithdrawJoinRequest(id);
  const leave = useLeaveGroup(id);
  const answer = useAnswerInvitation();
  const setMuted = useSetGroupMuted(id);
  const openChat = useOpenConversation();

  // Ảnh bìa tối: chữ thanh trạng thái phải sáng khi đang ở màn này.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  if (group.isPending) return <Loading />;
  if (group.isError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <IconButton icon="chevron-left" label="Quay lại" onPress={back} />
        <EmptyState icon="users" text={group.error.message} />
      </View>
    );
  }

  const g = group.data;
  const role = g.visible ? g.role : null;
  const manager = role === 'owner' || role === 'moderator';
  const invitation = invites.data?.invitations.find((i) => i.groupId === id) ?? null;
  const onRoster = invites.data?.rosters.some((r) => r.groupId === id) ?? false;
  const action = actionOf(g, invitation?.id ?? null, onRoster, code);
  const isMuted = muted.data?.has(id) ?? false;
  const fail = (e: Error) => toast(e.message);
  const joined = (outcome: JoinOutcome) =>
    toast(outcome === 'member' ? `Đã vào nhóm ${g.name}` : 'Đã gửi đơn, chờ quản trị nhóm duyệt');

  const primary = () =>
    guarded(() => {
      switch (action.kind) {
        case 'member':
          return setSheet('menu');
        case 'invited':
          return answer.mutate(
            { id: action.invitationId, accept: true },
            { onSuccess: () => joined('member'), onError: fail },
          );
        case 'join':
          return join.mutate(undefined, { onSuccess: joined, onError: fail });
        case 'request':
          return join.mutate(action.code, { onSuccess: joined, onError: fail });
        case 'code':
          return setSheet('code');
      }
    });

  const secondary = () => {
    if (action.kind === 'pending') {
      withdraw.mutate(undefined, { onSuccess: () => toast('Đã rút đơn'), onError: fail });
    } else if (action.kind === 'invited') {
      answer.mutate(
        { id: action.invitationId, accept: false },
        { onSuccess: () => toast('Đã từ chối lời mời'), onError: fail },
      );
    }
  };

  const choose = (choice: MenuChoice) => {
    if (choice === 'mute') setMuted.mutate(!isMuted, { onError: fail });
    else
      leave.mutate(undefined, { onSuccess: () => toast(`Đã rời nhóm ${g.name}`), onError: fail });
  };

  const messageAdmin = () =>
    guarded(() =>
      openChat.mutate(
        { kind: 'group', id },
        { onSuccess: (cid) => router.push(`/chat/${cid}`), onError: fail },
      ),
    );

  // Thành viên được chọn sẵn mức hợp với nhóm; người ngoài chỉ gửi "công khai trong nhóm", khi nhóm nhận tin người
  // ngoài (spec placement). Nhóm tạm khoá không nhận tin nào.
  const placement: Placement | null =
    !g.visible || g.state === 'locked'
      ? null
      : role
        ? isPublicGroup(g.mode)
          ? 'group_public'
          : 'members_only'
        : g.allowOutsiders
          ? 'group_public'
          : null;
  const compose = placement
    ? () => guarded(() => router.push({ pathname: '/post', params: { group: id, placement } }))
    : null;

  const menu: { value: MenuChoice; label: string; note: string }[] = [
    {
      value: 'mute',
      label: isMuted ? 'Bật tiếng nhóm' : 'Tắt tiếng nhóm',
      note: 'Thông báo của nhóm vẫn vào mục Thông báo, chỉ không nhắc.',
    },
    ...(g.visible && role !== 'owner'
      ? [
          {
            value: 'leave' as const,
            label: 'Rời nhóm',
            note: g.badgeEligible
              ? `${REJOIN_NOTE[g.mode]} Tin đang mang huy hiệu của nhóm sẽ mất huy hiệu.`
              : REJOIN_NOTE[g.mode],
          },
        ]
      : []),
  ];

  return (
    <View style={styles.screen}>
      <ScrollView>
        <GroupHeader
          group={g}
          topInset={insets.top}
          onBack={back}
          onShare={() => void Share.share({ message: `Nhóm ${g.name} trên Ghim` })}
        >
          <GroupActions
            action={action}
            busy={join.isPending || answer.isPending || withdraw.isPending}
            canMessageAdmin={!manager && action.kind !== 'closed'}
            onPrimary={primary}
            onSecondary={secondary}
            onMessageAdmin={messageAdmin}
          />
        </GroupHeader>

        {g.visible ? (
          <>
            <View style={styles.tabs}>
              <UnderlineTabs tabs={manager ? MANAGER_TABS : TABS} value={tab} onChange={setTab} />
            </View>
            <GroupBoard
              group={g}
              tab={tab}
              onCompose={compose}
              onOpenListing={(listingId) => router.push(`/listing/${listingId}`)}
            />
          </>
        ) : (
          <EmptyState
            icon="lock"
            text="Đây là nhóm riêng tư: chỉ thành viên xem được tin và thông báo của nhóm."
          />
        )}
      </ScrollView>

      <GroupCodeSheet
        visible={sheet === 'code'}
        busy={join.isPending}
        onSubmit={(entered) =>
          join.mutate(entered, {
            onSuccess: (outcome) => {
              setSheet(null);
              joined(outcome);
            },
            onError: fail,
          })
        }
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'menu'}
        title={g.name}
        options={menu}
        value={null}
        onSelect={choose}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  tabs: { marginTop: S.lg, paddingHorizontal: S.lg },
});
