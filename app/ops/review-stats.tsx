import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState, Loading } from '@/components/ui';
import { hitLabel } from '@/api/ops';
import { useReviewerStats, useRuleStats } from '@/queries/ops-admin';
import { C, F, R, S } from '@/theme';

const pct = (rate: number | null) => (rate === null ? '—' : `${Math.round(rate * 100)}%`);

/**
 * Chất lượng duyệt (master, spec review/post-review và screening/rule-management): người duyệt bị lật bao nhiêu khi
 * hậu kiểm — quyết định "đạt" mà tin sau bị gỡ — và luật nào máy giữ quá tay — tin máy giữ vì luật đó mà người cho đạt.
 */
export default function OpsReviewStats() {
  const reviewers = useReviewerStats();
  const rules = useRuleStats();

  if (reviewers.isPending || rules.isPending) return <Loading />;

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Thống kê duyệt" sub="Người duyệt và luật máy" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Theo người duyệt</Text>
        <Text style={styles.note}>
          Tỉ lệ bị lật: quyết định "đạt" đã hậu kiểm mà tin sau đó bị gỡ.
        </Text>
        {reviewers.isError ? (
          <EmptyState icon="users" text={reviewers.error.message} />
        ) : reviewers.data.length === 0 ? (
          <Text style={styles.note}>Chưa có quyết định nào được hậu kiểm.</Text>
        ) : (
          reviewers.data.map((r) => (
            <View key={r.accountId} style={styles.row}>
              <Text style={styles.name}>{r.name ?? r.accountId.slice(0, 8)}</Text>
              <Text style={styles.meta}>
                {r.reviewed} đã hậu kiểm · {r.overturned} bị lật
              </Text>
              <Text style={styles.rate}>{pct(r.rate)}</Text>
            </View>
          ))
        )}

        <Text style={styles.section}>Theo luật máy</Text>
        <Text style={styles.note}>
          Tỉ lệ quá tay: tin máy giữ vì luật này mà người duyệt cho đạt.
        </Text>
        {rules.isError ? (
          <EmptyState icon="sliders" text={rules.error.message} />
        ) : rules.data.length === 0 ? (
          <Text style={styles.note}>Chưa có tin máy giữ nào được quyết.</Text>
        ) : (
          rules.data.map((r) => (
            <View key={r.code} style={styles.row}>
              <Text style={styles.name}>{hitLabel(r.code)}</Text>
              <Text style={styles.meta}>
                {r.decided} đã quyết · {r.passed} cho đạt · {r.overreach} quá tay
              </Text>
              <Text style={styles.rate}>{pct(r.passRate)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.sm },
  section: { marginTop: S.md, fontFamily: F.uiBold, fontSize: 16, color: C.ink },
  note: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  row: {
    gap: 2,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  name: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  rate: { fontFamily: F.uiBold, fontSize: 18, color: C.brandDark },
});
