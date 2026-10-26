import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from '@/components/Chip';
import { Field } from '@/components/Field';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, PinButton } from '@/components/ui';
import type { RuleArticle } from '@/api/ops-admin';
import { useCreateRuleArticle, useRuleArticles, useUpdateRuleArticle } from '@/queries/ops-admin';
import { C, F, S } from '@/theme';

/** Bằng trần của server cho mã, tiêu đề, nội dung một điều. */
const CODE_MAX = 20;
const TITLE_MAX = 200;
const TEXT_MAX = 2000;

/** Một điều quy định (master): `new` là thêm. Mã điều không đổi được — cảnh cáo đã ra trích theo mã. */
export default function OpsArticle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const articles = useRuleArticles();
  const article = articles.data?.find((a) => a.id === id);

  if (id !== 'new' && articles.isPending) return <Loading />;
  if (id !== 'new' && !article) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Quy định sàn" />
        <EmptyState icon="book" text={articles.error?.message ?? 'Không có điều này'} />
      </View>
    );
  }
  return (
    <Editor
      article={article ?? null}
      nextSort={Math.max(0, ...(articles.data ?? []).map((a) => a.sort)) + 1}
    />
  );
}

function Editor({ article, nextSort }: { article: RuleArticle | null; nextSort: number }) {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateRuleArticle();
  const update = useUpdateRuleArticle();
  const [code, setCode] = useState('');
  const [title, setTitle] = useState(article?.title ?? '');
  const [text, setText] = useState(article?.text ?? '');
  const [sort, setSort] = useState(String(article?.sort ?? nextSort));
  const [active, setActive] = useState(article?.active ?? true);
  const sortValue = Number(sort);
  const ready =
    title.trim() !== '' &&
    text.trim() !== '' &&
    Number.isInteger(sortValue) &&
    sortValue >= 0 &&
    (article !== null || code.trim() !== '');
  const done = (msg: string) => () => {
    toast(msg);
    router.back();
  };
  const fail = (e: Error) => toast(e.message);

  const submit = () =>
    article
      ? update.mutate(
          { id: article.id, title: title.trim(), text: text.trim(), sort: sortValue, active },
          { onSuccess: done('Đã lưu điều'), onError: fail },
        )
      : create.mutate(
          { code: code.trim(), title: title.trim(), text: text.trim(), sort: sortValue },
          { onSuccess: done('Đã thêm điều'), onError: fail },
        );

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title={article ? `Điều ${article.code}` : 'Thêm điều'}
        sub="Cảnh cáo đã ra giữ bản trích cũ"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!article && (
            <Field
              label="Mã điều"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              maxLength={CODE_MAX}
              placeholder="vd: D7"
            />
          )}
          <Field label="Tiêu đề" value={title} onChangeText={setTitle} maxLength={TITLE_MAX} />
          <Field
            label="Nội dung"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={TEXT_MAX}
          />
          <Field label="Thứ tự" value={sort} onChangeText={setSort} keyboardType="number-pad" />
          {article && (
            <Check
              checked={active}
              label="Đang dùng — người xử chọn được khi ra cảnh cáo"
              onPress={() => setActive((v) => !v)}
            />
          )}
          <Text style={styles.note}>
            Sửa câu không đổi cảnh cáo đã ra: mỗi cảnh cáo giữ bản trích lúc ra.
          </Text>
          <PinButton
            label={article ? 'Lưu điều' : 'Thêm điều'}
            disabled={!ready}
            loading={create.isPending || update.isPending}
            onPress={submit}
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
