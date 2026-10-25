import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { OpsHeader } from '@/components/OpsHeader';
import { ConfirmSheet } from '@/components/PickerSheet';
import { TemplateFieldCard, type EditField } from '@/components/TemplateFieldCard';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, OutlineButton } from '@/components/ui';
import { useCategoryTemplate } from '@/queries/catalog';
import {
  useDiscardTemplateDraft,
  useOpsCategories,
  usePublishTemplate,
  useSaveTemplateDraft,
  useTemplateDraft,
} from '@/queries/ops-catalog';
import {
  fieldNameOf,
  isChoiceField,
  templateIssue,
  TEMPLATE_FIELDS_MAX,
  type TemplateDraft,
} from '@/api/ops';
import type { TemplateField } from '@/api/client';
import { C, F, S } from '@/theme';
import { formatAgo } from '@/utils/format';

let seq = 0;
const keyOf = () => `f${(seq += 1)}`;

const toEdit = (f: TemplateField): EditField => ({
  ...f,
  key: keyOf(),
  optionsText: f.options.join(', '),
  nameTouched: true,
  fresh: false,
});

const toField = ({
  key: _k,
  optionsText,
  nameTouched: _n,
  fresh: _f,
  ...f
}: EditField): TemplateField => ({
  ...f,
  label: f.label.trim(),
  options: isChoiceField(f.type)
    ? optionsText
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : [],
});

/**
 * Soạn mẫu thông tin của một danh mục (master): bản nháp không ảnh hưởng app cho tới khi phát hành; phát hành tạo phiên
 * bản kế, bất biến từ đó (spec category-catalog). Lưu dùng khoá lạc quan — ai khác lưu trước thì tải lại rồi sửa tiếp.
 */
export default function OpsTemplate() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const draft = useTemplateDraft(id);
  const category = useOpsCategories().data?.find((c) => c.id === id);
  const title = category ? `Mẫu · ${category.name}` : 'Mẫu thông tin';

  if (draft.isPending) return <Loading />;
  if (draft.isError) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title={title} />
        <EmptyState icon="lock" text={draft.error.message} />
      </View>
    );
  }
  // `key` theo số bản nháp: lưu, bỏ nháp hay phát hành xong, form dựng lại từ bản server vừa trả.
  return (
    <TemplateForm
      key={`${draft.data.draftVersion}:${category?.templateVersion ?? 0}`}
      id={id}
      title={title}
      draft={draft.data}
      currentVersion={category?.templateVersion ?? null}
    />
  );
}

function TemplateForm({
  id,
  title,
  draft,
  currentVersion,
}: {
  id: string;
  title: string;
  draft: TemplateDraft;
  currentVersion: number | null;
}) {
  const toast = useToast();
  const published = new Set((useCategoryTemplate(id).data ?? []).map((f) => f.name));
  const save = useSaveTemplateDraft(id);
  const discard = useDiscardTemplateDraft(id);
  const publish = usePublishTemplate(id);
  const [fields, setFields] = useState<EditField[]>(() => draft.fields.map(toEdit));
  const [dirty, setDirty] = useState(false);
  const [sheet, setSheet] = useState<'publish' | 'discard' | null>(null);

  const edit = (next: EditField[]) => {
    setFields(next);
    setDirty(true);
  };
  const change = (key: string, patch: Partial<EditField>) =>
    edit(
      fields.map((f) => {
        if (f.key !== key) return f;
        const merged = { ...f, ...patch };
        // Mục mới: tên đi theo nhãn tới khi người soạn tự sửa tên.
        return patch.label !== undefined && !f.nameTouched
          ? { ...merged, name: fieldNameOf(patch.label) }
          : merged;
      }),
    );
  const move = (index: number, delta: -1 | 1) => {
    const next = [...fields];
    const [item] = next.splice(index, 1);
    if (item) next.splice(index + delta, 0, item);
    edit(next);
  };
  const add = () =>
    edit([
      ...fields,
      {
        key: keyOf(),
        name: '',
        label: '',
        type: 'text',
        required: false,
        options: [],
        optionsText: '',
        nameTouched: false,
        fresh: true,
      },
    ]);

  const out = fields.map(toField);
  const issue = templateIssue(out);
  const fail = (e: Error) => toast(e.message);
  const sub = [
    currentVersion ? `Hiện hành v${currentVersion}` : 'Chưa phát hành',
    draft.draftVersion
      ? `nháp #${draft.draftVersion}${draft.updatedAt ? ` lưu ${formatAgo(draft.updatedAt)}` : ''}`
      : 'chưa có nháp',
  ].join(' · ');

  return (
    <View style={styles.screen}>
      <OpsHeader back title={title} sub={sub} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.note}>
            Bản nháp không đổi gì trên app cho tới khi phát hành. Mục đã phát hành giữ tên và kiểu —
            đổi nhãn thì được.
          </Text>
          {fields.length === 0 && (
            <Text style={styles.note}>Mẫu chưa có mục nào — tin đăng chỉ có các ô chung.</Text>
          )}
          {fields.map((f, i) => (
            <TemplateFieldCard
              key={f.key}
              field={f}
              index={i}
              locked={!f.fresh && published.has(f.name)}
              first={i === 0}
              last={i === fields.length - 1}
              onChange={(patch) => change(f.key, patch)}
              onMove={(delta) => move(i, delta)}
              onRemove={() => edit(fields.filter((x) => x.key !== f.key))}
            />
          ))}
          {fields.length < TEMPLATE_FIELDS_MAX && <OutlineButton label="Thêm mục" onPress={add} />}
        </ScrollView>
      </KeyboardAvoidingView>

      <ActionBar note={dirty && issue ? issue : null}>
        {draft.draftVersion > 0 && !dirty && (
          <BarButton tone="ghost" label="Bỏ nháp" onPress={() => setSheet('discard')} />
        )}
        {dirty ? (
          <BarButton
            icon="save"
            label="Lưu nháp"
            loading={save.isPending}
            onPress={() =>
              save.mutate(
                { base: draft.draftVersion, fields: out },
                { onSuccess: (v) => toast(`Đã lưu nháp #${v}`), onError: fail },
              )
            }
          />
        ) : (
          <BarButton
            icon="upload"
            label="Phát hành"
            disabled={draft.draftVersion === 0}
            loading={publish.isPending}
            onPress={() => setSheet('publish')}
          />
        )}
      </ActionBar>

      <ConfirmSheet
        visible={sheet === 'publish'}
        title={`Phát hành mẫu v${(currentVersion ?? 0) + 1}?`}
        confirmLabel="Phát hành"
        note="Tin đăng mới điền theo mẫu này; tin cũ giữ mẫu đã điền. Phiên bản đã phát hành không sửa được"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          publish.mutate(undefined, {
            onSuccess: () => toast('Đã phát hành mẫu thông tin'),
            onError: fail,
          })
        }
      />
      <ConfirmSheet
        visible={sheet === 'discard'}
        title="Bỏ bản nháp?"
        confirmLabel="Bỏ nháp"
        note="Mẫu hiện hành không đổi; những gì đã soạn trong nháp mất"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          discard.mutate(undefined, { onSuccess: () => toast('Đã bỏ bản nháp'), onError: fail })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.md },
  note: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
});
