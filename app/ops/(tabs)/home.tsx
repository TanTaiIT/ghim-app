import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter, type Href } from 'expo-router';
import { OpsHeader, OpsStats, type OpsStat } from '@/components/OpsHeader';
import { EmptyState, type IconName } from '@/components/ui';
import { useMe } from '@/queries/account';
import { useIdChecks } from '@/queries/ops-people';
import { useOpsTasks, useReviewBoard } from '@/queries/ops-review';
import { useSupportQueue } from '@/queries/ops-support';
import { C, F, R, S } from '@/theme';

const WEEKDAY = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function today(): string {
  const d = new Date();
  return `${WEEKDAY[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * Tổng quan ca trực. Số theo hàng chỉ master có (`/ops/review/stats/board`); staff thấy tổng việc trong hàng của mình.
 * Hàng xác minh giấy tờ và hỗ trợ cần quyền riêng — không có quyền thì dòng đó ghi rõ, không hiện số 0.
 */
export default function OpsHome() {
  const router = useRouter();
  const me = useMe().data;
  const isMaster = me?.isMaster ?? false;
  const board = useReviewBoard(isMaster).data;
  const mine = useOpsTasks(null).data;
  const ids = useIdChecks('pending');
  const support = useSupportQueue(true);

  const queues = (list: number[]) =>
    (board?.queues ?? [])
      .filter((q) => list.includes(q.queue))
      .reduce((s, q) => ({ open: s.open + q.open, overdue: s.overdue + q.overdue }), {
        open: 0,
        overdue: 0,
      });
  const overdue = (board?.queues ?? []).reduce((s, q) => s + q.overdue, 0);

  const stats: OpsStat[] = board
    ? [
        { label: 'Việc đang mở', value: board.open, accent: true },
        { label: 'Quá hạn', value: overdue },
        { label: 'Ở bậc master', value: board.atMaster.open },
      ]
    : [
        { label: 'Việc của tôi', value: mine?.total ?? '—', accent: true },
        { label: 'Giấy tờ chờ', value: ids.data?.total ?? '—' },
        { label: 'Hỗ trợ chờ', value: support.data?.total ?? '—' },
      ];

  const todo: TodoItem[] = [
    {
      icon: 'check-square',
      label: 'Duyệt tin',
      count: board ? queues([0, 3, 4, 5]) : null,
      href: '/ops/review',
    },
    {
      icon: 'flag',
      label: 'Báo cáo & gậy',
      count: board ? queues([1, 2]) : null,
      href: '/ops/reports',
    },
    {
      icon: 'credit-card',
      label: 'Xác minh giấy tờ',
      count: ids.data ? { open: ids.data.total, overdue: 0 } : null,
      denied: ids.isError,
      href: '/ops/people',
    },
    {
      icon: 'help-circle',
      label: 'Hỗ trợ người dùng',
      count: support.data ? { open: support.data.total, overdue: 0 } : null,
      denied: support.isError,
      href: '/ops/support',
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <OpsHeader
          role={isMaster ? 'Master' : 'Staff'}
          title={`Chào ${me?.name ?? 'bạn'}`}
          sub={today()}
        >
          <OpsStats items={stats} />
        </OpsHeader>

        <View style={styles.main}>
          <Text style={styles.section}>Việc cần làm</Text>
          <View style={styles.list}>
            {todo.map((t) => (
              <TodoRow key={t.label} item={t} onPress={() => router.navigate(t.href)} />
            ))}
          </View>

          <Text style={styles.section}>Hôm nay</Text>
          <View style={styles.pending}>
            <EmptyState
              icon="bar-chart-2"
              title="Chưa có API"
              text="Tin mới, thành viên mới, tỉ lệ từ chối và doanh thu đẩy tin theo ngày cần server mở thống kê — hiện chỉ có bảng đếm việc duyệt."
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type TodoItem = {
  icon: IconName;
  label: string;
  /** `null` khi không có số để hiện (staff không đọc được bảng đếm, hay đang tải). */
  count: { open: number; overdue: number } | null;
  denied?: boolean;
  href: Href;
};

/** Thanh dưới mỗi dòng là phần đã quá hạn trong số việc đang mở — đỏ dần là dấu hiệu cần thêm người trực. */
function TodoRow({ item, onPress }: { item: TodoItem; onPress: () => void }) {
  const { count } = item;
  const ratio = count && count.open > 0 ? count.overdue / count.open : 0;
  const caption = item.denied
    ? 'Tài khoản chưa có quyền này'
    : count
      ? count.overdue > 0
        ? `${count.overdue} việc quá hạn`
        : 'Không có việc quá hạn'
      : 'Mở để xem hàng chờ';
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>
        <Feather name={item.icon} size={16} color={C.brandDark} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowHead}>
          <Text style={styles.rowTitle}>{item.label}</Text>
          {count && <Text style={styles.rowCount}>{count.open}</Text>}
        </View>
        {count && count.open > 0 && (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
          </View>
        )}
        <Text style={[styles.caption, item.denied && { color: C.muted }]}>{caption}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  scroll: { paddingBottom: S.xl },
  main: { padding: S.lg, gap: S.md },
  section: { marginTop: S.sm, fontFamily: F.uiBold, fontSize: 18, color: C.ink },
  list: {
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: S.md,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: R.full,
    backgroundColor: C.brandLt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 6 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  rowCount: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  track: { height: 8, borderRadius: R.xs, backgroundColor: C.sand, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: R.xs, backgroundColor: C.price },
  caption: { fontFamily: F.uiMedium, fontSize: 12, color: C.inkSoft },
  pending: {
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
});
