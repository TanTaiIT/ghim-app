import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState, IconButton, Loading, Tag } from '@/components/ui';
import { useRuleArticles } from '@/queries/ops-admin';
import { C, F, R, S } from '@/theme';

/**
 * Quy định sàn (master, spec trust/strikes): các điều người xử trích khi ra cảnh cáo, theo thứ tự hiển thị. Điều tắt
 * không còn chọn được khi ra cảnh cáo mới; cảnh cáo đã ra giữ nguyên bản trích của nó.
 */
export default function OpsArticles() {
  const router = useRouter();
  const articles = useRuleArticles();

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title="Quy định sàn"
        sub="Trích khi ra cảnh cáo"
        right={
          <IconButton
            icon="plus"
            label="Thêm điều"
            variant="glass"
            onPress={() => router.push('/ops/articles/new')}
          />
        }
      />
      {articles.isPending ? (
        <Loading />
      ) : articles.isError ? (
        <EmptyState icon="book" text={articles.error.message} />
      ) : (
        <FlatList
          data={articles.data}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="book" text="Chưa có điều nào." />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/ops/articles/${item.id}`)}
              style={[styles.card, !item.active && styles.off]}
            >
              <View style={styles.head}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.title}>{item.title}</Text>
                {!item.active && <Tag label="Đã tắt" />}
              </View>
              <Text style={styles.text} numberOfLines={2}>
                {item.text}
              </Text>
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
    gap: S.xs,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  off: { opacity: 0.6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  code: { fontFamily: F.uiBold, fontSize: 13, color: C.brandDark },
  title: { flex: 1, fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  text: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
});
