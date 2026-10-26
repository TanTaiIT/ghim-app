import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState, IconButton, Loading, Tag } from '@/components/ui';
import { PHRASE_LEVEL_LABEL, RULE_MODE_LABEL } from '@/api/ops-screening';
import { usePhrases } from '@/queries/ops-screening';
import { C, F, R, S } from '@/theme';
import { formatDate } from '@/utils/format';

/**
 * Cụm từ cấm (master, spec screening/banned-phrases): cùng bộ so cho tin đăng, tin nhắn và tên. Mức chắc chặn hẳn; mức
 * mơ hồ cộng điểm (tin nhắn thì gửi kèm dấu cho người xử). Cụm mới chạy thử trước — máy ghi lại lượt trúng mà không đổi
 * kết quả.
 */
export default function OpsPhrases() {
  const router = useRouter();
  const phrases = usePhrases();

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title="Cụm từ cấm"
        sub="Cụm mới chạy thử trước khi bật"
        right={
          <IconButton
            icon="plus"
            label="Thêm cụm từ"
            variant="glass"
            onPress={() => router.push('/ops/phrases/new')}
          />
        }
      />
      {phrases.isPending ? (
        <Loading />
      ) : phrases.isError ? (
        <EmptyState icon="slash" text={phrases.error.message} />
      ) : (
        <FlatList
          data={phrases.data}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState icon="slash" title="Chưa có cụm nào" text="Bấm + để thêm cụm đầu tiên." />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/ops/phrases/${item.id}`)}
              style={styles.card}
            >
              <View style={styles.head}>
                <Text style={styles.text}>{item.text}</Text>
                <Tag
                  label={RULE_MODE_LABEL[item.mode]}
                  tone={item.mode === 'on' ? 'brand' : item.mode === 'trial' ? 'amber' : 'neutral'}
                />
              </View>
              <Text style={styles.meta}>
                {PHRASE_LEVEL_LABEL[item.level]}
                {item.exceptions.length > 0 ? ` · ${item.exceptions.length} ngoại lệ` : ''}
                {item.mode === 'trial' && item.trialEndsAt
                  ? ` · chạy thử tới ${formatDate(item.trialEndsAt)}`
                  : ''}
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
  head: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  text: { flex: 1, fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
});
