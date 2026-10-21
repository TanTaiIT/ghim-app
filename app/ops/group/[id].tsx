import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { InputSheet } from '@/components/InputSheet';
import { OpsHeader } from '@/components/OpsHeader';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, Tag } from '@/components/ui';
import {
  useCloseOpsGroup,
  useLockOpsGroup,
  useOpsGroup,
  useUnlockOpsGroup,
} from '@/queries/ops-groups';
import { GROUP_KIND_LABEL, GROUP_MODE_LABEL, GROUP_STATE_LABEL } from '@/api/ops';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/**
 * Hồ sơ nhóm (master): khoá tạm kèm lý do, mở khoá, đóng vĩnh viễn. Giao chủ (`owner-offers`) cần chọn một người cụ
 * thể, mà bàn vận hành chưa tìm được người dùng — để lại cho lượt có API tìm người.
 */
export default function OpsGroup() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const group = useOpsGroup(id);
  const lock = useLockOpsGroup();
  const unlock = useUnlockOpsGroup();
  const close = useCloseOpsGroup();
  const [sheet, setSheet] = useState<'lock' | 'close' | null>(null);

  if (group.isPending) return <Loading />;
  if (group.isError) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Nhóm" />
        <EmptyState icon="alert-circle" text={group.error.message} />
      </View>
    );
  }
  const g = group.data;
  const closed = g.state === 'closed';
  const busy = lock.isPending || unlock.isPending || close.isPending;
  const rows: [string, string][] = [
    ['Loại', GROUP_KIND_LABEL[g.kind]],
    ['Cách vào', GROUP_MODE_LABEL[g.mode]],
    ['Thành viên', String(g.memberCount)],
    [
      'Chủ nhóm',
      g.ownerId ? 'Đã có chủ' : g.nomineeId ? 'Đang chờ người được đề cử nhận' : 'Chưa có',
    ],
    ...(g.ownerlessSince
      ? [['Thiếu chủ từ', formatAgo(g.ownerlessSince)] as [string, string]]
      : []),
    ...(g.code ? [['Mã vào nhóm', g.code] as [string, string]] : []),
    ...(g.units.length ? [['Đơn vị', g.units.join(', ')] as [string, string]] : []),
  ];

  return (
    <View style={styles.screen}>
      <OpsHeader back title={g.name} sub={GROUP_STATE_LABEL[g.state]} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tags}>
          <Tag label={GROUP_STATE_LABEL[g.state]} tone={g.state === 'active' ? 'brand' : 'amber'} />
        </View>
        {g.description && <Text style={styles.text}>{g.description}</Text>}
        {g.lockedReason && <Text style={styles.warn}>Lý do khoá: {g.lockedReason}</Text>}
        <View style={styles.card}>
          {rows.map(([k, v]) => (
            <View key={k} style={styles.kv}>
              <Text style={styles.key}>{k}</Text>
              <Text style={styles.value}>{v}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <ActionBar note={closed ? 'Nhóm đã đóng vĩnh viễn.' : null}>
        {g.state === 'locked' ? (
          <BarButton
            icon="unlock"
            label="Mở khoá"
            loading={unlock.isPending}
            onPress={() =>
              unlock.mutate(g.id, {
                onSuccess: () => toast('Đã mở khoá nhóm'),
                onError: (e) => toast(e.message),
              })
            }
          />
        ) : (
          <BarButton
            tone="dangerSoft"
            icon="lock"
            label="Tạm khoá"
            disabled={busy}
            onPress={() => setSheet('lock')}
          />
        )}
        <BarButton
          tone="danger"
          label="Đóng nhóm"
          disabled={busy}
          onPress={() => setSheet('close')}
        />
      </ActionBar>

      <InputSheet
        visible={sheet === 'lock'}
        title={`Tạm khoá ${g.name}?`}
        note="Tin của nhóm ẩn khỏi mọi người tới khi mở khoá."
        label="Lý do khoá"
        confirmLabel="Khoá"
        tone="danger"
        minLength={3}
        busy={lock.isPending}
        onClose={() => setSheet(null)}
        onSubmit={(reason) =>
          lock.mutate(
            { id: g.id, reason },
            {
              onSuccess: () => {
                setSheet(null);
                toast('Đã tạm khoá nhóm');
              },
              onError: (e) => toast(e.message),
            },
          )
        }
      />
      <ConfirmSheet
        visible={sheet === 'close'}
        title={`Đóng ${g.name}?`}
        confirmLabel="Đóng nhóm vĩnh viễn"
        note="Không mở lại được — tin trong nhóm không còn hiện với ai"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          close.mutate(g.id, {
            onSuccess: () => toast('Đã đóng nhóm'),
            onError: (e) => toast(e.message),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  tags: { flexDirection: 'row', gap: 6 },
  text: { fontFamily: F.ui, fontSize: 14, lineHeight: 21, color: C.inkMid },
  warn: { fontFamily: F.uiMedium, fontSize: 13, color: C.warnTx },
  card: {
    gap: S.sm,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  kv: { flexDirection: 'row', gap: S.md },
  key: { width: 110, fontFamily: F.uiMedium, fontSize: 14, color: C.inkSoft },
  value: { flex: 1, fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
});
