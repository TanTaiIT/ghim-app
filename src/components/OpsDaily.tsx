import { StyleSheet, Text, View } from 'react-native';
import type { DayStats } from '@/api/ops';
import { EmptyState, Loading } from './ui';
import { C, F, R, S } from '@/theme';

/** `YYYY-MM-DD` → `dd/mm`; khoá ngày đã theo giờ Việt Nam từ server nên không qua `Date`. */
const dayLabel = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

/** Tỉ lệ từ chối trên quyết định về tin; chưa quyết định nào thì để trống, không hiện 0 %. */
const rejectRate = (d: DayStats): string => {
  const total = d.decisions.passed + d.decisions.rejected;
  return total === 0 ? '—' : `${Math.round((d.decisions.rejected / total) * 100)}%`;
};

/**
 * Ô "Hôm nay" của trang chủ bàn vận hành: bốn số của hôm nay, dòng máy giữ / người quyết, rồi các ngày trước. Chỉ
 * master có số (`/ops/stats/daily`); staff thấy câu nói rõ thay vì ô trống.
 */
export function OpsDaily({
  master,
  days,
  pending,
  error,
}: {
  master: boolean;
  days: DayStats[] | undefined;
  pending: boolean;
  error: string | null;
}) {
  if (!master) {
    return (
      <EmptyState
        icon="bar-chart-2"
        title="Chỉ master xem số theo ngày"
        text="Việc của bạn hôm nay nằm ở hàng chờ phía trên."
      />
    );
  }
  if (pending) return <Loading />;
  if (error !== null || !days?.[0]) {
    return <EmptyState icon="bar-chart-2" text={error ?? 'Chưa có số liệu.'} />;
  }
  const [today, ...earlier] = days;
  const tiles = [
    { label: 'Tin gửi máy', value: today.submissions },
    { label: 'Lên bảng', value: today.firstLive },
    { label: 'Người mới', value: today.newAccounts },
    { label: 'Từ chối', value: rejectRate(today) },
  ];
  return (
    <View style={styles.card}>
      <View style={styles.tiles}>
        {tiles.map((t) => (
          <View key={t.label} style={styles.tile}>
            <Text style={styles.tileValue}>{t.value}</Text>
            <Text style={styles.tileLabel}>{t.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.meta}>
        Máy: đầy đủ {today.machine.passFull} · hạn chế {today.machine.passLimited} · giữ{' '}
        {today.machine.hold}. Người duyệt: đạt {today.decisions.passed}, từ chối{' '}
        {today.decisions.rejected}.
      </Text>
      {earlier.map((d) => (
        <View key={d.day} style={styles.row}>
          <Text style={styles.rowDay}>{dayLabel(d.day)}</Text>
          <Text style={styles.rowText} numberOfLines={1}>
            gửi {d.submissions} · lên bảng {d.firstLive} · mới {d.newAccounts} · từ chối{' '}
            {rejectRate(d)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: S.md,
    gap: S.sm,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  tiles: { flexDirection: 'row', gap: S.sm },
  tile: { flex: 1, gap: 2, padding: S.sm, borderRadius: R.sm, backgroundColor: C.sand },
  tileValue: { fontFamily: F.uiBold, fontSize: 20, color: C.ink },
  tileLabel: { fontFamily: F.ui, fontSize: 11, color: C.inkSoft },
  meta: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  row: {
    flexDirection: 'row',
    gap: S.sm,
    paddingTop: S.xs,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  rowDay: { width: 44, fontFamily: F.uiSemi, fontSize: 12, color: C.ink },
  rowText: { flex: 1, fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
});
