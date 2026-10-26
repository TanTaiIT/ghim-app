import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { Choice } from '@/components/Chip';
import { Field } from '@/components/Field';
import { InputSheet } from '@/components/InputSheet';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, PinButton } from '@/components/ui';
import {
  PHRASE_LEVEL_LABEL,
  RULE_MODE_LABEL,
  type Phrase,
  type PhraseLevel,
} from '@/api/ops-screening';
import {
  useActivatePhrase,
  useCreatePhrase,
  useDeactivatePhrase,
  usePhrases,
  useUpdatePhrase,
} from '@/queries/ops-screening';
import { C, F, S } from '@/theme';
import { formatDate } from '@/utils/format';

const LEVELS = Object.keys(PHRASE_LEVEL_LABEL) as PhraseLevel[];

/** Mỗi dòng một ngoại lệ — cụm dài hơn chứa cụm cấm mà không phải ý cấm (vd "chuyển khoản qua sàn"). */
const linesOf = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/** Một cụm từ cấm (master): `new` là thêm. Chữ của cụm không đổi được — cần chữ khác thì thêm cụm mới. */
export default function OpsPhrase() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const phrases = usePhrases();
  const phrase = phrases.data?.find((p) => p.id === id);

  if (id !== 'new' && phrases.isPending) return <Loading />;
  if (id !== 'new' && !phrase) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Cụm từ cấm" />
        <EmptyState icon="slash" text={phrases.error?.message ?? 'Không có cụm này'} />
      </View>
    );
  }
  // `key` theo lần đổi: bật / tắt / lưu xong form dựng lại từ dữ liệu server.
  return (
    <Editor
      key={phrase ? `${phrase.mode}-${phrase.level}-${phrase.exceptions.join('|')}` : 'new'}
      phrase={phrase ?? null}
    />
  );
}

function Editor({ phrase }: { phrase: Phrase | null }) {
  const router = useRouter();
  const toast = useToast();
  const create = useCreatePhrase();
  const update = useUpdatePhrase();
  const activate = useActivatePhrase();
  const deactivate = useDeactivatePhrase();
  const [text, setText] = useState('');
  const [level, setLevel] = useState<PhraseLevel>(phrase?.level ?? 'ambiguous');
  const [exceptions, setExceptions] = useState(phrase?.exceptions.join('\n') ?? '');
  const [asking, setAsking] = useState(false);
  const busy = create.isPending || update.isPending || activate.isPending || deactivate.isPending;
  const fail = (e: Error) => toast(e.message);
  const dirty =
    phrase !== null &&
    (level !== phrase.level || linesOf(exceptions).join('\n') !== phrase.exceptions.join('\n'));

  const submit = () =>
    phrase
      ? update.mutate(
          { id: phrase.id, level, exceptions: linesOf(exceptions) },
          { onSuccess: () => toast('Đã lưu cụm từ'), onError: fail },
        )
      : create.mutate(
          { text: text.trim(), level, exceptions: linesOf(exceptions) },
          {
            onSuccess: () => {
              toast('Đã thêm cụm — đang chạy thử');
              router.back();
            },
            onError: fail,
          },
        );

  /** Chưa hết chạy thử thì server đòi lý do bật sớm. */
  const turnOn = (reason?: string) => {
    if (!phrase) return;
    const early = phrase.trialEndsAt !== null && Date.parse(phrase.trialEndsAt) > Date.now();
    if (early && !reason) {
      setAsking(true);
      return;
    }
    activate.mutate(
      { id: phrase.id, reason },
      { onSuccess: () => toast(`Đã bật "${phrase.text}"`), onError: fail },
    );
  };

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title={phrase ? phrase.text : 'Thêm cụm từ cấm'}
        sub={
          phrase
            ? `${RULE_MODE_LABEL[phrase.mode]}${phrase.mode === 'trial' && phrase.trialEndsAt ? ` tới ${formatDate(phrase.trialEndsAt)}` : ''}`
            : 'Cụm mới bắt đầu ở chạy thử'
        }
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!phrase && (
            <Field
              label="Cụm từ"
              value={text}
              onChangeText={setText}
              autoCapitalize="none"
              placeholder="vd: chuyển khoản trước"
            />
          )}
          <Text style={styles.label}>Mức</Text>
          <View style={styles.choices}>
            {LEVELS.map((l) => (
              <Choice
                key={l}
                align="left"
                label={PHRASE_LEVEL_LABEL[l]}
                selected={l === level}
                onPress={() => setLevel(l)}
              />
            ))}
          </View>
          <Field
            label="Ngoại lệ — mỗi dòng một cụm"
            value={exceptions}
            onChangeText={setExceptions}
            multiline
            autoCapitalize="none"
            placeholder="vd: chuyển khoản qua sàn"
          />
          {phrase?.activationReason && (
            <Text style={styles.meta}>Lý do bật sớm: {phrase.activationReason}</Text>
          )}
          <PinButton
            label={phrase ? 'Lưu cụm từ' : 'Thêm cụm từ'}
            disabled={phrase ? !dirty : text.trim().length < 2}
            loading={create.isPending || update.isPending}
            onPress={submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      {phrase && (
        <ActionBar note={null}>
          {phrase.mode !== 'on' && (
            <BarButton label="Bật thật" disabled={busy} onPress={() => turnOn()} />
          )}
          {phrase.mode !== 'off' && (
            <BarButton
              tone="danger"
              label="Tắt"
              disabled={busy}
              onPress={() =>
                deactivate.mutate(phrase.id, {
                  onSuccess: () => toast(`Đã tắt "${phrase.text}"`),
                  onError: fail,
                })
              }
            />
          )}
        </ActionBar>
      )}
      <InputSheet
        visible={asking}
        title="Bật trước khi hết chạy thử"
        note="Cụm còn đang chạy thử — ghi lý do bật sớm, lý do vào nhật ký vận hành"
        label="Lý do"
        confirmLabel="Bật thật"
        minLength={1}
        busy={activate.isPending}
        onClose={() => setAsking(false)}
        onSubmit={(reason) => {
          setAsking(false);
          turnOn(reason.trim());
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.md },
  label: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  choices: { gap: S.sm },
  meta: { fontFamily: F.ui, fontSize: 13, color: C.inkSoft },
});
