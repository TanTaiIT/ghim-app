import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { OpsHeader } from '@/components/OpsHeader';
import { OpsTaskCard } from '@/components/OpsTaskCard';
import { SegmentedTabs } from '@/components/TabStrip';
import { EmptyState, Loading } from '@/components/ui';
import { useCategories } from '@/queries/catalog';
import { useOpsTasks } from '@/queries/ops-review';
import { C, S } from '@/theme';

type Tab = 'reports' | 'strikes';

/** Hàng 1 (báo cáo) và hàng 2 (khiếu nại gậy, gậy nghiêm trọng). Báo cáo luôn phải đọc bối cảnh mới quyết được. */
const QUEUE: Record<Tab, number> = { reports: 1, strikes: 2 };

export default function OpsReports() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('reports');
  const tasks = useOpsTasks(QUEUE[tab]);
  const categories = useCategories().data ?? [];
  const nameOf = (id: string | null) => categories.find((c) => c.id === id)?.name ?? null;
  const severe = tasks.data?.items.filter((t) => t.reasons.includes('report_severe')).length ?? 0;

  return (
    <View style={styles.screen}>
      <OpsHeader
        title="Báo cáo vi phạm"
        sub={
          tasks.data
            ? `${tasks.data.total} việc${tab === 'reports' ? ` · ${severe} lừa đảo / hàng cấm` : ''}`
            : undefined
        }
      >
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'reports', label: 'Báo cáo' },
            { id: 'strikes', label: 'Việc về cảnh cáo' },
          ]}
        />
      </OpsHeader>
      {tasks.isPending ? (
        <Loading />
      ) : tasks.isError ? (
        <EmptyState icon="wifi-off" text={tasks.error.message} />
      ) : (
        <FlatList
          data={tasks.data.items}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          onRefresh={() => void tasks.refetch()}
          refreshing={tasks.isRefetching}
          ListEmptyComponent={
            <EmptyState
              icon="check-circle"
              title="Không có việc"
              text="Không còn báo cáo nào chờ bạn xử."
            />
          }
          renderItem={({ item }) => (
            <OpsTaskCard
              task={item}
              category={nameOf(item.categoryId)}
              onOpen={() => router.push(`/ops/task/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  list: { padding: S.lg, gap: S.md },
});
