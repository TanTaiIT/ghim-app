import { FlatList, StyleSheet, Text, View } from 'react-native';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState, Loading, Tag } from '@/components/ui';
import { JOB_STATUS_LABEL } from '@/api/ops-admin';
import { useJobRuns } from '@/queries/ops-admin';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/**
 * Lượt chạy việc theo lịch gần nhất (master): dọn hạn lưu, hết hạn tin, đối chiếu kho ảnh… "Làm được một phần" là lượt
 * chạm trần thời gian — lượt sau làm tiếp; "Lỗi" kèm câu lỗi để báo người vận hành server.
 */
export default function OpsJobs() {
  const runs = useJobRuns();

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Việc nền" sub="100 lượt chạy gần nhất" />
      {runs.isPending ? (
        <Loading />
      ) : runs.isError ? (
        <EmptyState icon="clock" text={runs.error.message} />
      ) : (
        <FlatList
          data={runs.data}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="clock" text="Chưa có lượt chạy nào." />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.head}>
                <Text style={styles.name}>{item.name}</Text>
                <Tag
                  label={JOB_STATUS_LABEL[item.status]}
                  tone={
                    item.status === 'done' ? 'brand' : item.status === 'partial' ? 'amber' : 'boost'
                  }
                />
              </View>
              <Text style={styles.meta}>
                Bắt đầu {formatAgo(item.startedAt)}
                {item.finishedAt ? '' : ' · chưa xong'}
              </Text>
              {item.summary && (
                <Text style={styles.details} numberOfLines={3}>
                  {item.summary}
                </Text>
              )}
              {item.error && <Text style={styles.error}>{item.error}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  list: { padding: S.lg, gap: S.sm },
  row: {
    gap: 4,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  name: { flex: 1, fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  details: { fontFamily: F.ui, fontSize: 11, color: C.muted },
  error: { fontFamily: F.uiMedium, fontSize: 12, color: C.pin },
});
