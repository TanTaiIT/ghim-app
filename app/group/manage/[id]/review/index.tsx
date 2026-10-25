import { FlatList, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OpsTaskCard } from '@/components/OpsTaskCard';
import { EmptyState, Loading, ScreenHeader } from '@/components/ui';
import { useCategories } from '@/queries/catalog';
import { useGroupReviewTasks } from '@/queries/group-manage';
import { C, F, S } from '@/theme';

/**
 * Hàng chờ duyệt của nhóm: tin thành viên đăng vào nhóm bị máy giữ, ở bậc của người xem (điều hành lớp → cả nhóm → chủ
 * nhóm). Cùng thẻ việc với bàn vận hành; quyết định ở trang việc, không có nút nhanh — nhóm không có nhiều việc tới mức
 * phải duyệt từ danh sách.
 */
export default function GroupReviewQueue() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tasks = useGroupReviewTasks(id, true);
  const categories = useCategories().data ?? [];
  const overdue = tasks.data?.items.filter((t) => t.overdue).length ?? 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Hàng chờ duyệt" />
      {tasks.data && tasks.data.total > 0 && (
        <Text style={styles.sub}>
          {tasks.data.total} tin chờ nhóm duyệt{overdue ? ` · ${overdue} quá hạn` : ''}
        </Text>
      )}
      <FlatList
        data={tasks.data?.items ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.content}
        onRefresh={() => void tasks.refetch()}
        refreshing={tasks.isRefetching}
        renderItem={({ item }) => (
          <OpsTaskCard
            task={item}
            category={categories.find((c) => c.id === item.categoryId)?.name ?? null}
            onOpen={() => router.push(`/group/manage/${id}/review/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          tasks.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              icon={tasks.isError ? 'lock' : 'check-circle'}
              text={tasks.error?.message ?? 'Không có tin nào chờ nhóm duyệt.'}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  sub: { paddingHorizontal: S.lg, fontFamily: F.ui, fontSize: 13, color: C.inkSoft },
  content: { padding: S.lg, gap: S.md },
});
