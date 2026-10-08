import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui';
import { useReadiness } from '@/queries/health';
import { C, F, R, S, shadow } from '@/theme';

/** Màu đèn theo trạng thái query — bảng tra ngoài component, không tính lại mỗi render. */
const LIGHT = {
  up: { color: C.moss, label: 'Backend sẵn sàng' },
  down: { color: C.pin, label: 'Backend chưa nối được DB' },
  unknown: { color: C.amber, label: 'Đang kiểm tra backend…' },
} as const;

export default function Home() {
  const readiness = useReadiness();
  const light = readiness.isError
    ? LIGHT.down
    : readiness.data
      ? LIGHT[readiness.data.database]
      : LIGHT.unknown;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        // Chưa có module tin đăng ở backend (`add-listings`): danh sách rỗng là trạng thái thật, không fixture.
        data={[]}
        renderItem={null}
        contentContainerStyle={styles.content}
        refreshing={readiness.isRefetching}
        onRefresh={readiness.refetch}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Bảng tin</Text>
            <View style={styles.statusCard}>
              <View style={[styles.dot, { backgroundColor: light.color }]} />
              <Text style={styles.statusText}>{light.label}</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="📌"
            text="Chưa có tin nào. Tin đăng sẽ xuất hiện khi backend mở module tin."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { flexGrow: 1, padding: S.lg, gap: S.lg },
  header: { gap: S.md },
  title: { fontFamily: F.uiBlack, fontSize: 24, color: C.ink },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.paperWarm,
    borderRadius: R.md,
    padding: S.md,
    ...shadow,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontFamily: F.uiSemi, fontSize: 14, color: C.inkSoft },
});
