import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { InputSheet } from '@/components/InputSheet';
import { OpsTaskBody } from '@/components/OpsTaskBody';
import { PickerSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, ScreenHeader, useBack } from '@/components/ui';
import { useCategories } from '@/queries/catalog';
import {
  useDecideGroupTask,
  useGroupReasonTemplates,
  useGroupReviewTask,
} from '@/queries/group-manage';
import { detachDecision, type GroupDecision } from '@/api/group-manage';
import { JUDGMENT_OPTIONS, taskKind } from '@/api/ops';
import { C } from '@/theme';

type Sheet = 'judgment' | 'reason' | 'detach' | null;

/**
 * Một việc của nhóm với ba lối ra: duyệt (tin máy giữ thì nói máy đúng hay quá tay), từ chối kèm lý do mẫu, gỡ khỏi
 * nhóm — một bảng cho cả "chỉ gỡ" và "gỡ + báo vi phạm quy định sàn" (có chữ là báo), để không mở bảng này từ bảng kia.
 * Quyết xong thì về hàng chờ: việc đã đóng.
 */
export default function GroupReviewTask() {
  const { id = '', taskId = '' } = useLocalSearchParams<{ id: string; taskId: string }>();
  const router = useRouter();
  const back = useBack();
  const toast = useToast();
  const task = useGroupReviewTask(id, taskId);
  const categories = useCategories().data ?? [];
  const reasons = useGroupReasonTemplates(id).data ?? [];
  const decide = useDecideGroupTask(id);
  const [sheet, setSheet] = useState<Sheet>(null);

  if (task.isPending) return <Loading />;
  if (task.isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Việc của nhóm" />
        <EmptyState icon="alert-circle" text={task.error.message} />
      </SafeAreaView>
    );
  }

  const t = task.data;
  const held = t.reasons.includes('machine_hold');
  const decidable = taskKind(t.reasons) === 'screen' && t.claim !== 'taken';
  const busy = decide.isPending;
  const run = (decision: GroupDecision, done: string) =>
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
  const note =
    t.claim === 'taken'
      ? 'Người khác đang xử việc này — chờ họ xong hoặc hết 10 phút giữ việc.'
      : !decidable
        ? 'Việc này không xử được trên app của nhóm.'
        : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title={t.title ?? 'Việc của nhóm'} />
      <ScrollView>
        <OpsTaskBody
          task={t}
          category={categories.find((c) => c.id === t.categoryId)?.name ?? null}
          onOpenPerson={(personId) => router.push(`/user/${personId}`)}
        />
      </ScrollView>
      <ActionBar note={note}>
        <BarButton
          tone="ghost"
          label="Gỡ khỏi nhóm"
          disabled={busy}
          onPress={() => setSheet('detach')}
        />
        <BarButton
          tone="dangerSoft"
          icon="x"
          label="Từ chối"
          disabled={busy}
          onPress={() =>
            reasons.length > 0
              ? setSheet('reason')
              : toast('Chưa có lý do mẫu — master của sàn soạn ở bàn vận hành')
          }
        />
        <BarButton
          icon="check"
          label="Duyệt tin"
          loading={busy}
          onPress={() => (held ? setSheet('judgment') : run({ kind: 'pass' }, 'Đã duyệt tin'))}
        />
      </ActionBar>

      <PickerSheet
        visible={sheet === 'judgment'}
        title="Máy giữ tin này có đúng không?"
        options={JUDGMENT_OPTIONS}
        value={null}
        onSelect={(judgment) => run({ kind: 'pass', judgment }, 'Đã duyệt tin')}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'reason'}
        title="Lý do — người đăng sẽ đọc câu này"
        options={reasons.map((r) => ({ value: r.id, label: r.text }))}
        value={null}
        onSelect={(reasonTemplateId) => run({ kind: 'reject', reasonTemplateId }, 'Đã từ chối tin')}
        onClose={() => setSheet(null)}
      />
      <InputSheet
        visible={sheet === 'detach'}
        title="Gỡ tin khỏi nhóm"
        note="Tin rời nhóm ngay, người đăng không chịu hệ quả nào khác. Ghi lý do nếu tin trái quy định của sàn — staff sẽ xem lại; để trống nếu chỉ không hợp với nhóm."
        label="Lý do vi phạm quy định sàn (tuỳ chọn)"
        placeholder="Bán hàng giả, hàng cấm…"
        confirmLabel="Gỡ khỏi nhóm"
        tone="dangerSoft"
        minLength={0}
        multiline
        busy={busy}
        onClose={() => setSheet(null)}
        onSubmit={(text) =>
          run(detachDecision(text), text.trim() ? 'Đã gỡ khỏi nhóm và báo sàn' : 'Đã gỡ khỏi nhóm')
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
});
