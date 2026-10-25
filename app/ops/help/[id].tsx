import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Field } from '@/components/Field';
import { OpsHeader } from '@/components/OpsHeader';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, GhostButton, Loading, OutlineButton, PinButton } from '@/components/ui';
import type { HelpTopic } from '@/api/client';
import { useHelpTopics } from '@/queries/account';
import { useDeleteHelpTopic, useSaveHelpTopic } from '@/queries/ops-help';
import { C, F, R, S } from '@/theme';

type Faq = HelpTopic['faqs'][number];
/** Câu đang sửa: server không cấp mã cho câu hỏi, nên màn tự đánh khoá để thêm / bỏ câu không lẫn ô nhập. */
type Draft = Faq & { key: number };

let draftSeq = 0;
const draft = (f: Faq): Draft => ({ ...f, key: draftSeq++ });

/** Một chủ đề trợ giúp (master): \`new\` là thêm. Server nhận cả chủ đề một lượt, nên màn sửa tại chỗ rồi lưu một lần. */
export default function OpsHelpTopic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topics = useHelpTopics();
  const isNew = id === 'new';
  const topic = topics.data?.find((t) => t.id === id);

  if (!isNew && topics.isPending) return <Loading />;
  if (!isNew && !topic) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Chủ đề trợ giúp" />
        <EmptyState icon="help-circle" text={topics.error?.message ?? 'Không có chủ đề này'} />
      </View>
    );
  }
  return <Editor topic={topic ?? null} />;
}

function Editor({ topic }: { topic: HelpTopic | null }) {
  const router = useRouter();
  const toast = useToast();
  const save = useSaveHelpTopic();
  const remove = useDeleteHelpTopic();
  const [label, setLabel] = useState(topic?.label ?? '');
  const [faqs, setFaqs] = useState<Draft[]>(() => (topic?.faqs ?? [{ q: '', a: '' }]).map(draft));
  const [confirming, setConfirming] = useState(false);
  const filled = faqs
    .filter((f) => f.q.trim() !== '' && f.a.trim() !== '')
    .map(({ q, a }) => ({ q, a }));

  const change = (key: number, patch: Partial<Faq>) =>
    setFaqs(faqs.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  const submit = () =>
    save.mutate(
      { id: topic?.id ?? null, topic: { label: label.trim(), faqs: filled } },
      {
        onSuccess: () => {
          toast(topic ? 'Đã lưu chủ đề' : 'Đã thêm chủ đề');
          router.back();
        },
        onError: (e) => toast(e.message),
      },
    );

  return (
    <View style={styles.screen}>
      <OpsHeader back title={topic ? 'Sửa chủ đề' : 'Thêm chủ đề'} sub="Câu trống bị bỏ khi lưu" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label="Tên chủ đề" value={label} onChangeText={setLabel} maxLength={80} />
          {faqs.map((f, index) => (
            <View key={f.key} style={styles.faq}>
              <Text style={styles.faqTitle}>Câu {index + 1}</Text>
              <Field
                label="Câu hỏi"
                value={f.q}
                onChangeText={(q) => change(f.key, { q })}
                maxLength={200}
              />
              <Field
                label="Trả lời"
                value={f.a}
                onChangeText={(a) => change(f.key, { a })}
                multiline
                maxLength={2000}
              />
              {faqs.length > 1 && (
                <GhostButton
                  label="Bỏ câu này"
                  onPress={() => setFaqs(faqs.filter((x) => x.key !== f.key))}
                />
              )}
            </View>
          ))}
          <OutlineButton
            label="Thêm câu hỏi"
            onPress={() => setFaqs([...faqs, draft({ q: '', a: '' })])}
          />
          <PinButton
            label={topic ? 'Lưu chủ đề' : 'Thêm chủ đề'}
            disabled={label.trim() === '' || filled.length === 0}
            loading={save.isPending}
            onPress={submit}
          />
          {topic && <GhostButton label="Xoá chủ đề" onPress={() => setConfirming(true)} />}
        </ScrollView>
      </KeyboardAvoidingView>
      {topic && (
        <ConfirmSheet
          visible={confirming}
          title={`Xoá "${topic.label}"?`}
          confirmLabel="Xoá chủ đề"
          note="Người dùng không còn thấy chủ đề này ở màn trợ giúp"
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            remove.mutate(topic.id, {
              onSuccess: () => {
                toast('Đã xoá chủ đề');
                router.back();
              },
              onError: (e) => toast(e.message),
            })
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.md },
  faq: {
    gap: S.sm,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  faqTitle: { fontFamily: F.uiBold, fontSize: 13, color: C.inkSoft },
});
