import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, IconButton, Loading } from '@/components/ui';
import { useHelpTopics } from '@/queries/account';
import { useReorderHelpTopics } from '@/queries/ops-help';
import { C, F, R, S } from '@/theme';

/**
 * Trợ giúp (master, ghim-server add-help-content): người dùng, cả khách, đọc nguyên văn theo đúng thứ tự này. Mũi tên
 * đổi chỗ với chủ đề kề bên; bấm một chủ đề để sửa tên và câu hỏi / đáp.
 */
export default function OpsHelp() {
  const router = useRouter();
  const toast = useToast();
  const topics = useHelpTopics();
  const reorder = useReorderHelpTopics();

  const move = (index: number, by: -1 | 1) => {
    const ids = (topics.data ?? []).map((t) => t.id);
    const target = index + by;
    const [a, b] = [ids[index], ids[target]];
    if (a === undefined || b === undefined) return;
    ids[index] = b;
    ids[target] = a;
    reorder.mutate(ids, { onError: (e) => toast(e.message) });
  };

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title="Trợ giúp"
        sub="Người dùng đọc nguyên văn, theo thứ tự này"
        right={
          <IconButton
            icon="plus"
            label="Thêm chủ đề"
            variant="glass"
            onPress={() => router.push('/ops/help/new')}
          />
        }
      />
      {topics.isPending ? (
        <Loading />
      ) : topics.isError ? (
        <EmptyState icon="help-circle" text={topics.error.message} />
      ) : (
        <FlatList
          data={topics.data}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="help-circle"
              title="Chưa có chủ đề nào"
              text="Màn trợ giúp của người dùng đang trống. Bấm + để thêm."
            />
          }
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/ops/help/${item.id}`)}
              style={styles.card}
            >
              <View style={styles.body}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.meta}>{item.faqs.length} câu hỏi</Text>
              </View>
              {index > 0 && (
                <IconButton
                  icon="chevron-up"
                  label={`Đưa "${item.label}" lên`}
                  onPress={() => move(index, -1)}
                />
              )}
              {index < topics.data.length - 1 && (
                <IconButton
                  icon="chevron-down"
                  label={`Đưa "${item.label}" xuống`}
                  onPress={() => move(index, 1)}
                />
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  list: { padding: S.lg, gap: S.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  body: { flex: 1, gap: 2 },
  label: { fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
});
