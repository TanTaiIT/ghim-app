import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState, Loading } from '@/components/ui';
import type { MachineMonth } from '@/api/ops';
import { useMachineStats } from '@/queries/ops-stats';
import { C, F, R, S } from '@/theme';

/** `YYYY-MM` → `mm/yyyy`; tháng đã là khoá của server nên không qua `Date`. */
const monthLabel = (month: string) => `${month.slice(5, 7)}/${month.slice(0, 4)}`;

/** Phần trăm trên tổng lượt; chưa có lượt nào thì để trống, không hiện 0 %. */
const share = (part: number, total: number): string =>
  total === 0 ? '—' : `${Math.round((part / total) * 100)}%`;

/**
 * Số liệu máy theo tháng (ghim-server add-screening-stats), chỉ master: tổng 12 tháng, từng tháng mới trước, và các luật
 * trúng nhiều nhất. Số tính cả tháng đã gộp khi hết hạn lưu, nên tháng xa vẫn có số dù lượt chi tiết đã xoá.
 */
export default function MachineStats() {
  const stats = useMachineStats();

  if (stats.isPending) return <Loading />;
  if (stats.isError) {
    return (
      <View style={styles.screen}>
        <OpsHeader title="Số liệu máy duyệt" back />
        <EmptyState icon="bar-chart-2" text={stats.error.message} />
      </View>
    );
  }

  const { months, topRules } = stats.data;
  const total = months.reduce(
    (sum, m) => ({
      runs: sum.runs + m.runs,
      passed: sum.passed + m.passFull + m.passLimited,
      hold: sum.hold + m.hold,
      high: sum.high + m.high,
    }),
    { runs: 0, passed: 0, hold: 0, high: 0 },
  );
  const tiles = [
    { label: 'Lượt máy', value: String(total.runs) },
    { label: 'Cho qua', value: share(total.passed, total.runs) },
    { label: 'Giữ cho người', value: share(total.hold, total.runs) },
    { label: 'Dải Cao', value: share(total.high, total.runs) },
  ];

  return (
    <View style={styles.screen}>
      <OpsHeader title="Số liệu máy duyệt" sub={`${months.length} tháng gần nhất`} back />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tiles}>
          {tiles.map((t) => (
            <View key={t.label} style={styles.tile}>
              <Text style={styles.tileValue}>{t.value}</Text>
              <Text style={styles.tileLabel}>{t.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Theo tháng</Text>
        <View style={styles.card}>
          {months.toReversed().map((m) => (
            <MonthRow key={m.month} month={m} />
          ))}
        </View>

        <Text style={styles.section}>Luật trúng nhiều nhất</Text>
        <View style={styles.card}>
          {topRules.length === 0 ? (
            <Text style={styles.meta}>Chưa luật nào trúng trong khoảng này.</Text>
          ) : (
            topRules.map((r) => (
              <View key={r.code} style={styles.row}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {r.label}
                </Text>
                <Text style={styles.rowValue}>{r.runs} lượt</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function MonthRow({ month: m }: { month: MachineMonth }) {
  return (
    <View style={styles.month}>
      <View style={styles.row}>
        <Text style={styles.rowTitle}>{monthLabel(m.month)}</Text>
        <Text style={styles.rowValue}>{m.runs} lượt</Text>
      </View>
      {m.runs > 0 && (
        <Text style={styles.meta}>
          Đầy đủ {m.passFull} · hạn chế {m.passLimited} · giữ {m.hold} — dải Thấp {m.low} · Vừa{' '}
          {m.medium} · Cao {m.high}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  tiles: { flexDirection: 'row', gap: S.sm },
  tile: { flex: 1, gap: 2, padding: S.sm, borderRadius: R.sm, backgroundColor: C.sand },
  tileValue: { fontFamily: F.uiBold, fontSize: 18, color: C.ink },
  tileLabel: { fontFamily: F.ui, fontSize: 11, color: C.inkSoft },
  section: { marginTop: S.sm, fontFamily: F.uiBold, fontSize: 13, color: C.inkSoft },
  card: {
    padding: S.md,
    gap: S.sm,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  month: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  rowTitle: { flex: 1, fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  rowValue: { fontFamily: F.uiBold, fontSize: 14, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
});
