import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Field } from '@/components/Field';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, PinButton } from '@/components/ui';
import { useCategoryKeywords, useSetKeywords } from '@/queries/ops-screening';
import { C, F, S } from '@/theme';

/** Mỗi dòng một từ khoá; dòng trống bỏ. */
const linesOf = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * Từ khoá suy ra danh mục (master, staff của danh mục — spec screening/rule-management): tiêu đề tin chứa từ khoá của
 * danh mục khác với danh mục người đăng chọn là trúng "sai danh mục". Server lưu dạng bỏ dấu, viết hoa — đúng dạng nó so.
 */
export default function OpsCategoryKeywords() {
  const { id = '', name = '' } = useLocalSearchParams<{ id: string; name?: string }>();
  const keywords = useCategoryKeywords(id);

  if (keywords.isPending) return <Loading />;
  if (keywords.isError) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Từ khoá danh mục" />
        <EmptyState icon="tag" text={keywords.error.message} />
      </View>
    );
  }
  // `key` theo bộ đã lưu: lưu xong server trả bộ đã bỏ dấu, ô nhập dựng lại đúng dạng đó.
  return <Editor key={keywords.data.join('|')} id={id} name={name} saved={keywords.data} />;
}

function Editor({ id, name, saved }: { id: string; name: string; saved: string[] }) {
  const toast = useToast();
  const set = useSetKeywords();
  const [text, setText] = useState(saved.join('\n'));
  const next = linesOf(text);

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Từ khoá danh mục" sub={name || `${saved.length} từ khoá`} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.note}>
            Mỗi dòng một từ khoá. Có dấu hay không dấu đều được — máy so trên dạng bỏ dấu, trùng thì
            chỉ giữ một. Để trống hết là danh mục không có từ khoá nào.
          </Text>
          <Field
            label={`Từ khoá (${next.length})`}
            value={text}
            onChangeText={setText}
            multiline
            autoCapitalize="none"
            placeholder={'vd:\nđiện thoại\niphone'}
          />
          <PinButton
            label="Lưu từ khoá"
            disabled={next.join('\n') === saved.join('\n')}
            loading={set.isPending}
            onPress={() =>
              set.mutate(
                { categoryId: id, keywords: next },
                {
                  onSuccess: (kept) => toast(`Đã lưu ${kept.length} từ khoá`),
                  onError: (e) => toast(e.message),
                },
              )
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.md },
  note: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
});
