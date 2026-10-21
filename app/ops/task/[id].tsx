import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { InputSheet } from '@/components/InputSheet';
import { OpsHeader, useOpsBack } from '@/components/OpsHeader';
import { OpsTaskBody } from '@/components/OpsTaskBody';
import { ConfirmSheet, PickerSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading } from '@/components/ui';
import { useMe } from '@/queries/account';
import { useCategories } from '@/queries/catalog';
import { useDecideTask, useOpsTask, useReasonTemplates } from '@/queries/ops-review';
import { JUDGMENT_OPTIONS, taskKind, type MachineJudgment, type TaskDecision } from '@/api/ops';
import { C } from '@/theme';
import { formatDue } from '@/utils/format';

/** Bảng nào đang mở và nó dẫn tới quyết định gì khi chọn xong. */
type Sheet =
  | { kind: 'judgment'; next: (j: MachineJudgment) => TaskDecision }
  | { kind: 'reason'; next: (reasonId: string) => TaskDecision }
  | { kind: 'lock' }
  | { kind: 'note' }
  | null;

/**
 * Chi tiết một việc và các nút quyết định theo loại việc (`taskKind`). Quyết định xong thì quay về hàng chờ: việc đã
 * đóng, ở lại màn này chỉ còn đọc được bối cảnh cũ.
 */
export default function OpsTask() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const back = useOpsBack();
  const toast = useToast();
  const task = useOpsTask(id);
  const isMaster = useMe().data?.isMaster ?? false;
  const categories = useCategories().data ?? [];
  const reasons = useReasonTemplates().data?.filter((r) => r.active) ?? [];
  const decide = useDecideTask();
  const [sheet, setSheet] = useState<Sheet>(null);

  if (task.isPending) return <Loading />;
  if (task.isError) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Việc duyệt" />
        <EmptyState icon="alert-circle" text={task.error.message} />
      </View>
    );
  }

  const t = task.data;
  const kind = taskKind(t.reasons);
  const held = t.reasons.includes('machine_hold');
  const onListing = t.subject === 'listing' && !t.listingDeleted;

  const run = (decision: TaskDecision, done: string) =>
    decide.mutate(
      { task: t, decision },
      {
        onSuccess: () => {
          setSheet(null);
          toast(done);
          back();
        },
        onError: (e) => toast(e.message),
      },
    );
  const askReason = (next: (reasonId: string) => TaskDecision) =>
    reasons.length > 0
      ? setSheet({ kind: 'reason', next })
      : toast('Chưa có lý do mẫu — master thêm ở Thêm › Lý do từ chối mẫu');
  const approve = () =>
    held
      ? setSheet({ kind: 'judgment', next: (judgment) => ({ kind: 'pass', judgment }) })
      : run({ kind: 'pass' }, 'Đã duyệt tin');

  const busy = decide.isPending;
  const buttons = () => {
    switch (kind) {
      case 'screen':
        return (
          <>
            <BarButton
              tone="dangerSoft"
              icon="x"
              label="Từ chối"
              disabled={busy}
              onPress={() =>
                askReason((reasonTemplateId) => ({ kind: 'reject', reasonTemplateId }))
              }
            />
            <BarButton icon="check" label="Duyệt tin" loading={busy} onPress={approve} />
          </>
        );
      case 'report':
        return (
          <>
            <BarButton
              tone="ghost"
              label="Bỏ qua"
              disabled={busy}
              onPress={() =>
                held
                  ? setSheet({
                      kind: 'judgment',
                      next: (judgment) => ({ kind: 'report', verdict: 'dismissed', judgment }),
                    })
                  : run({ kind: 'report', verdict: 'dismissed' }, 'Đã bác báo cáo')
              }
            />
            {onListing ? (
              <BarButton
                tone="dangerSoft"
                label="Gỡ tin"
                disabled={busy}
                onPress={() =>
                  askReason((removeWith) => ({ kind: 'report', verdict: 'upheld', removeWith }))
                }
              />
            ) : (
              <BarButton
                tone="dangerSoft"
                label="Xác nhận"
                disabled={busy}
                onPress={() => run({ kind: 'report', verdict: 'upheld' }, 'Đã xác nhận báo cáo')}
              />
            )}
            {isMaster && (
              <BarButton
                tone="danger"
                label="Khoá TK"
                disabled={busy}
                onPress={() => setSheet({ kind: 'lock' })}
              />
            )}
          </>
        );
      case 'escalation':
        return (
          <BarButton
            tone="ghost"
            label="Bác việc chuyển lên"
            loading={busy}
            onPress={() => setSheet({ kind: 'note' })}
          />
        );
      case 'appeal':
        return (
          <>
            <BarButton
              tone="ghost"
              label="Giữ gậy"
              disabled={busy}
              onPress={() =>
                run({ kind: 'appeal', verdict: 'lost' }, 'Đã giữ gậy — khiếu nại thua')
              }
            />
            <BarButton
              label="Huỷ gậy"
              loading={busy}
              onPress={() =>
                run({ kind: 'appeal', verdict: 'won' }, 'Đã huỷ gậy — khiếu nại thắng')
              }
            />
          </>
        );
      case 'other':
        return null;
    }
  };

  const note =
    t.claim === 'taken'
      ? 'Người khác đang xử việc này — chờ họ xong hoặc hết 10 phút giữ việc.'
      : kind === 'other'
        ? 'Gậy nghiêm trọng và xét khoá vĩnh viễn chưa xử được trên app.'
        : null;

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title={t.title ?? 'Việc duyệt'}
        sub={`${formatDue(t.dueAt)}${t.atMaster ? ' · ở bậc master' : ''}`}
      />
      <ScrollView>
        <OpsTaskBody
          task={t}
          category={categories.find((c) => c.id === t.categoryId)?.name ?? null}
          onOpenPerson={(personId, name) =>
            router.push({ pathname: '/ops/user/[id]', params: { id: personId, name: name ?? '' } })
          }
        />
      </ScrollView>
      <ActionBar note={note}>{buttons()}</ActionBar>

      <PickerSheet
        visible={sheet?.kind === 'judgment'}
        title="Máy giữ tin này có đúng không?"
        options={JUDGMENT_OPTIONS}
        value={null}
        onSelect={(j) => sheet?.kind === 'judgment' && run(sheet.next(j), 'Đã quyết định')}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet?.kind === 'reason'}
        title="Lý do — người đăng sẽ đọc câu này"
        options={reasons.map((r) => ({ value: r.id, label: r.text }))}
        value={null}
        onSelect={(rid) => sheet?.kind === 'reason' && run(sheet.next(rid), 'Đã gỡ / từ chối tin')}
        onClose={() => setSheet(null)}
      />
      <ConfirmSheet
        visible={sheet?.kind === 'lock'}
        title="Khoá tài khoản người này?"
        confirmLabel="Báo cáo đúng và khoá tài khoản"
        note="Mọi phiên đăng nhập bị thu hồi vài giây sau quyết định"
        onConfirm={() =>
          run({ kind: 'report', verdict: 'upheld', lockAccount: true }, 'Đã khoá tài khoản')
        }
        onClose={() => setSheet(null)}
      />
      <InputSheet
        visible={sheet?.kind === 'note'}
        title="Bác việc nhóm chuyển lên"
        note="Tin vẫn ở ngoài nhóm như nhóm đã quyết. Xác nhận vi phạm (ra gậy cho người đăng) chưa có trên app."
        label="Ghi chú"
        placeholder="Không thấy dấu hiệu vi phạm quy định sàn"
        confirmLabel="Bác"
        busy={busy}
        onSubmit={(text) =>
          run({ kind: 'dismissEscalation', note: text }, 'Đã bác việc chuyển lên')
        }
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
});
