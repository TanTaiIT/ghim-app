import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Chip } from '@/components/Chip';
import { OpsHeader } from '@/components/OpsHeader';
import { OpsTaskCard } from '@/components/OpsTaskCard';
import { PickerSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading } from '@/components/ui';
import { useCategories } from '@/queries/catalog';
import { useDecideTask, useOpsTasks, useReasonTemplates } from '@/queries/ops-review';
import {
  JUDGMENT_OPTIONS,
  QUEUE_LABEL,
  taskKind,
  type MachineJudgment,
  type OpsTask,
} from '@/api/ops';
import { C, S } from '@/theme';

/** Hàng của việc về tin (báo cáo và gậy ở tab Báo cáo). Máy giữ đứng đầu: tin còn chờ, người đăng đang đợi. */
const QUEUES = [0, 3, 4, 5];

/**
 * Hàng chờ duyệt tin. Việc máy giữ / hạn chế duyệt nhanh được ngay trên thẻ như bộ UI; việc khác mở chi tiết. Không có
 * "Hoàn tác": quyết định trên server là cuối cùng (một việc một quyết định), sửa sai thì khôi phục tin ở bản sau.
 */
export default function OpsReview() {
  const router = useRouter();
  const toast = useToast();
  const [queue, setQueue] = useState(0);
  const tasks = useOpsTasks(queue);
  const categories = useCategories().data ?? [];
  const reasons = useReasonTemplates().data?.filter((r) => r.active) ?? [];
  const decide = useDecideTask();
  const [rejecting, setRejecting] = useState<OpsTask | null>(null);
  const [approving, setApproving] = useState<OpsTask | null>(null);

  const nameOf = (id: string | null) => categories.find((c) => c.id === id)?.name ?? null;
  const done = (t: OpsTask, verb: string) => () => toast(`${verb} “${t.title ?? 'tin'}”`);
  const pass = (t: OpsTask, judgment?: MachineJudgment) =>
    decide.mutate(
      { task: t, decision: { kind: 'pass', ...(judgment && { judgment }) } },
      { onSuccess: done(t, 'Đã duyệt'), onError: (e) => toast(e.message) },
    );
  const approve = (t: OpsTask) => (t.reasons.includes('machine_hold') ? setApproving(t) : pass(t));
  const reject = (t: OpsTask) =>
    reasons.length > 0
      ? setRejecting(t)
      : toast('Chưa có lý do từ chối mẫu — master thêm ở Thêm › Lý do mẫu');

  const total = tasks.data?.total ?? 0;
  const overdue = tasks.data?.items.filter((t) => t.overdue).length ?? 0;

  return (
    <View style={styles.screen}>
      <OpsHeader
        title="Duyệt tin"
        sub={
          tasks.data
            ? `${total} việc ở hàng ${QUEUE_LABEL[queue]?.toLowerCase()} · ${overdue} quá hạn`
            : undefined
        }
      />
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {QUEUES.map((q) => (
            <Chip
              key={q}
              label={QUEUE_LABEL[q] ?? String(q)}
              selected={q === queue}
              onPress={() => setQueue(q)}
            />
          ))}
        </ScrollView>
      </View>
      {tasks.isPending ? (
        <Loading />
      ) : tasks.isError ? (
        <EmptyState icon="wifi-off" text={tasks.error.message} />
      ) : (
        <FlatList
          data={tasks.data.items}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          onRefresh={() => void tasks.refetch()}
          refreshing={tasks.isRefetching}
          ListEmptyComponent={
            <EmptyState
              icon="check-circle"
              title="Hết việc"
              text="Hàng này không còn việc nào chờ bạn."
            />
          }
          renderItem={({ item }) => (
            <OpsTaskCard
              task={item}
              category={nameOf(item.categoryId)}
              onOpen={() => router.push(`/ops/task/${item.id}`)}
              quick={
                taskKind(item.reasons) === 'screen'
                  ? {
                      onApprove: () => approve(item),
                      onReject: () => reject(item),
                      busy: decide.isPending && decide.variables?.task.id === item.id,
                    }
                  : null
              }
            />
          )}
        />
      )}

      <PickerSheet
        visible={approving !== null}
        title="Máy giữ tin này có đúng không?"
        options={JUDGMENT_OPTIONS}
        value={null}
        onSelect={(j) => approving && pass(approving, j)}
        onClose={() => setApproving(null)}
      />
      <PickerSheet
        visible={rejecting !== null}
        title="Lý do từ chối"
        options={reasons.map((r) => ({ value: r.id, label: r.text }))}
        value={null}
        onSelect={(id) =>
          rejecting &&
          decide.mutate(
            { task: rejecting, decision: { kind: 'reject', reasonTemplateId: id } },
            { onSuccess: done(rejecting, 'Đã từ chối'), onError: (e) => toast(e.message) },
          )
        }
        onClose={() => setRejecting(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  chips: { gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.md },
  list: { paddingHorizontal: S.lg, paddingBottom: S.xl, gap: S.md },
});
