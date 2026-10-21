import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BarButton } from './ActionBar';
import { Tag } from './ui';
import { QUEUE_LABEL, REASON_LABEL, type OpsTask } from '@/api/ops';
import { C, F, R, S } from '@/theme';
import { formatDue } from '@/utils/format';

/**
 * Một việc trong hàng chờ. Danh sách của server không kèm ảnh hay giá — bối cảnh đầy đủ ở màn chi tiết, nên thẻ chỉ đủ
 * để chọn việc nào làm trước: tiêu đề, lý do, hạn, ai đang giữ. `quick` chỉ có với việc máy giữ / hạn chế: duyệt nhanh
 * từ hàng chờ như bộ UI, còn báo cáo và gậy luôn phải mở chi tiết mới quyết được.
 */
export function OpsTaskCard({
  task,
  category,
  onOpen,
  quick,
}: {
  task: OpsTask;
  category: string | null;
  onOpen: () => void;
  quick?: { onApprove: () => void; onReject: () => void; busy: boolean } | null;
}) {
  const taken = task.claim === 'taken';
  // Việc về một người mang tên người đó làm tiêu đề — không có dòng "Về một người dùng" thì trông y như một tin đăng.
  const subject = task.subject === 'account' ? 'Về một người dùng' : null;
  const title =
    task.title ??
    (task.subject === 'account'
      ? 'Một người dùng'
      : task.subject === 'strike'
        ? 'Gậy cần xét'
        : 'Tin chưa có tiêu đề');
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.top}>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[QUEUE_LABEL[task.queue], subject, category, task.atMaster ? 'Ở bậc master' : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <View style={styles.tags}>
            {task.reasons.map((r) => (
              <Tag
                key={r}
                label={REASON_LABEL[r]}
                tone={r.startsWith('report') ? 'boost' : 'neutral'}
              />
            ))}
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={C.muted} />
      </Pressable>
      <View style={styles.foot}>
        <Feather name="clock" size={13} color={task.overdue ? C.pin : C.muted} />
        <Text style={[styles.due, task.overdue && styles.overdue]}>{formatDue(task.dueAt)}</Text>
        {task.claim !== 'free' && (
          <Text style={styles.claim}>{taken ? 'Đang có người xử' : 'Bạn đang giữ'}</Text>
        )}
      </View>
      {quick && !taken && (
        <View style={styles.actions}>
          <BarButton
            compact
            tone="dangerSoft"
            icon="x"
            label="Từ chối"
            onPress={quick.onReject}
            disabled={quick.busy}
          />
          <BarButton
            compact
            icon="check"
            label="Duyệt"
            onPress={quick.onApprove}
            loading={quick.busy}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  body: { flex: 1, minWidth: 0, gap: S.xs },
  title: { fontFamily: F.uiSemi, fontSize: 15, lineHeight: 21, color: C.ink },
  meta: { fontFamily: F.uiMedium, fontSize: 12, color: C.inkSoft },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  due: { fontFamily: F.uiMedium, fontSize: 12, color: C.inkSoft },
  overdue: { fontFamily: F.uiBold, color: C.pin },
  claim: {
    marginLeft: 'auto',
    paddingHorizontal: S.sm,
    paddingVertical: 2,
    borderRadius: R.full,
    overflow: 'hidden',
    backgroundColor: C.sand,
    fontFamily: F.uiBold,
    fontSize: 11,
    color: C.inkMid,
  },
  actions: { flexDirection: 'row', gap: 10 },
});
