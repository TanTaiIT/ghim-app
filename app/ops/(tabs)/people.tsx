import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BarButton } from '@/components/ActionBar';
import { Avatar } from '@/components/Avatar';
import { InputSheet } from '@/components/InputSheet';
import { OpsAccountList } from '@/components/OpsAccountList';
import { OpsHeader } from '@/components/OpsHeader';
import { SegmentedTabs } from '@/components/TabStrip';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, Tag } from '@/components/ui';
import { useDecideIdCheck, useIdChecks } from '@/queries/ops-people';
import type { IdCheck } from '@/api/ops';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

type Tab = 'pending' | 'verified' | 'rejected' | 'all';

const STATUS_TAG: Record<
  IdCheck['status'],
  { label: string; tone: 'amber' | 'brand' | 'neutral' }
> = {
  pending: { label: 'Chờ duyệt', tone: 'amber' },
  verified: { label: 'Đã xác minh', tone: 'brand' },
  rejected: { label: 'Đã từ chối', tone: 'neutral' },
};

/**
 * Người dùng trên bàn vận hành: ba mục đầu là hồ sơ giấy tờ, mục "Tất cả" là danh bạ (`/ops/accounts`, master và
 * staff hỗ trợ). Hồ sơ một người mở từ đây, từ việc duyệt (người đăng, người bị báo cáo) và từ hồ sơ giấy tờ. Server
 * chỉ giữ loại giấy, họ tên, số đã mã hoá — không có ảnh giấy tờ hay ảnh chân dung để so như bộ UI vẽ.
 */
export default function OpsPeople() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('pending');
  const checks = useIdChecks(tab === 'all' ? null : tab);
  const decide = useDecideIdCheck();
  const [rejecting, setRejecting] = useState<IdCheck | null>(null);

  const openPerson = (c: IdCheck) =>
    router.push({ pathname: '/ops/user/[id]', params: { id: c.accountId, name: c.fullName } });

  return (
    <View style={styles.screen}>
      <OpsHeader title="Người dùng" sub="Xác minh giấy tờ và hồ sơ vi phạm">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'pending', label: 'Chờ duyệt' },
            { id: 'verified', label: 'Đã duyệt' },
            { id: 'rejected', label: 'Từ chối' },
            { id: 'all', label: 'Tất cả' },
          ]}
        />
      </OpsHeader>
      {tab === 'all' ? (
        <OpsAccountList
          onOpen={(a) =>
            router.push({ pathname: '/ops/user/[id]', params: { id: a.id, name: a.displayName } })
          }
        />
      ) : checks.isPending ? (
        <Loading />
      ) : checks.isError ? (
        <EmptyState icon="lock" text={checks.error.message} />
      ) : (
        <FlatList
          data={checks.data.items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          onRefresh={() => void checks.refetch()}
          refreshing={checks.isRefetching}
          ListEmptyComponent={
            <EmptyState icon="credit-card" text="Không có hồ sơ giấy tờ nào ở mục này." />
          }
          renderItem={({ item }) => {
            const busy = decide.isPending && decide.variables?.id === item.id;
            const tag = STATUS_TAG[item.status];
            return (
              <View style={styles.card}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openPerson(item)}
                  style={styles.row}
                >
                  <Avatar name={item.fullName} size={44} />
                  <View style={styles.body}>
                    <Text style={styles.name}>{item.fullName}</Text>
                    <Text style={styles.meta}>
                      {item.documentType} · gửi {formatAgo(item.submittedAt)}
                    </Text>
                    {item.reason && <Text style={styles.meta}>Lý do: {item.reason}</Text>}
                  </View>
                  <Tag label={tag.label} tone={tag.tone} />
                  <Feather name="chevron-right" size={18} color={C.muted} />
                </Pressable>
                {item.status === 'pending' && (
                  <View style={styles.actions}>
                    <BarButton
                      compact
                      tone="dangerSoft"
                      label="Từ chối"
                      disabled={busy}
                      onPress={() => setRejecting(item)}
                    />
                    <BarButton
                      compact
                      icon="check"
                      label="Cấp tích xanh"
                      loading={busy}
                      onPress={() =>
                        decide.mutate(
                          { id: item.id, approve: true },
                          {
                            onSuccess: () => toast(`Đã xác minh ${item.fullName}`),
                            onError: (e) => toast(e.message),
                          },
                        )
                      }
                    />
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      <InputSheet
        visible={rejecting !== null}
        title="Từ chối hồ sơ giấy tờ"
        note="Người dùng đọc được lý do này và nộp lại."
        label="Lý do"
        placeholder="Họ tên không khớp với giấy tờ"
        confirmLabel="Từ chối"
        tone="danger"
        busy={decide.isPending}
        onClose={() => setRejecting(null)}
        onSubmit={(reason) =>
          rejecting &&
          decide.mutate(
            { id: rejecting.id, approve: false, reason },
            {
              onSuccess: () => {
                setRejecting(null);
                toast('Đã từ chối hồ sơ');
              },
              onError: (e) => toast(e.message),
            },
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  list: { padding: S.lg, gap: S.md },
  card: {
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  meta: { fontFamily: F.uiMedium, fontSize: 12, color: C.inkSoft },
  actions: { flexDirection: 'row', gap: 10 },
});
