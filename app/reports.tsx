import { FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionRow } from '@/components/ActionRow';
import { EmptyState, Loading, ScreenHeader, type IconName } from '@/components/ui';
import { useMyReports } from '@/queries/settings';
import { REPORT_CATEGORY_LABEL, type MyReport } from '@/api/client';
import { C, S } from '@/theme';
import { formatAgo } from '@/utils/format';

const STATUS: Record<MyReport['status'], string> = {
  open: 'Đang xem xét',
  upheld: 'Đã xử lý — báo cáo đúng',
  dismissed: 'Không thấy vi phạm',
};

const SUBJECT: Record<'listing' | 'account', { icon: IconName; label: string }> = {
  listing: { icon: 'tag', label: 'Một tin đăng' },
  account: { icon: 'user', label: 'Một người dùng' },
};

/**
 * Báo cáo mình đã gửi và kết quả. Server không trả tên người hay tiêu đề tin bị báo — chỉ mã để mở lại; báo cáo không cho
 * người báo biết thêm gì về ai (TK 23).
 */
export default function MyReports() {
  const router = useRouter();
  const reports = useMyReports();

  const open = (r: MyReport) =>
    r.subject?.kind === 'listing'
      ? router.push(`/listing/${r.subject.id}`)
      : r.subject && router.push(`/user/${r.subject.id}`);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Báo cáo của tôi" />
      <FlatList
        data={reports.data ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        onRefresh={() => void reports.refetch()}
        refreshing={reports.isRefetching}
        renderItem={({ item }) => {
          const subject = item.subject ? SUBJECT[item.subject.kind] : null;
          return (
            <ActionRow
              icon={subject?.icon ?? 'flag'}
              title={`${subject?.label ?? 'Đã xoá'} · ${REPORT_CATEGORY_LABEL[item.category]}`}
              meta={`${STATUS[item.status]} · gửi ${formatAgo(item.reportedAt)}`}
              action={item.subject ? { label: 'Xem', onPress: () => open(item) } : null}
            />
          );
        }}
        ListEmptyComponent={
          reports.isPending ? (
            <Loading />
          ) : (
            <EmptyState icon="flag" text={reports.error?.message ?? 'Bạn chưa gửi báo cáo nào.'} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.sm },
});
