import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Choice } from '@/components/Chip';
import { Field } from '@/components/Field';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, GhostButton, Loading, PinButton } from '@/components/ui';
import {
  RULE_MODE_LABEL,
  RULE_WEIGHT_MAX,
  type CategoryRule,
  type RuleMode,
} from '@/api/ops-screening';
import {
  useCategoryScreening,
  useClearRuleOverride,
  useSetRuleOverride,
} from '@/queries/ops-screening';
import { C, F, S } from '@/theme';

const MODES = Object.keys(RULE_MODE_LABEL) as RuleMode[];

/**
 * Một luật ở một danh mục (master): chế độ và trọng số riêng; "Như chung" = để trống phần đó. Server ghi cả hai một lượt
 * (thiếu là dùng giá trị chung), nên lưu gửi đủ cả hai. Cổng cứng không tắt được, kể cả riêng một danh mục.
 */
export default function OpsCategoryRule() {
  const {
    categoryId = '',
    code = '',
    name = '',
  } = useLocalSearchParams<{
    categoryId: string;
    code: string;
    name?: string;
  }>();
  const screening = useCategoryScreening(categoryId);
  const rule = screening.data?.rules.find((r) => r.code === code);

  if (screening.isPending) return <Loading />;
  if (!rule) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Luật riêng" />
        <EmptyState icon="sliders" text={screening.error?.message ?? 'Không có luật này'} />
      </View>
    );
  }
  return <Editor categoryId={categoryId} name={name} rule={rule} />;
}

function Editor({
  categoryId,
  name,
  rule,
}: {
  categoryId: string;
  name: string;
  rule: CategoryRule;
}) {
  const router = useRouter();
  const toast = useToast();
  const set = useSetRuleOverride();
  const clear = useClearRuleOverride();
  const [mode, setMode] = useState<RuleMode | null>(rule.override?.mode ?? null);
  const [weight, setWeight] = useState(
    rule.override?.weight === null || rule.override === null ? '' : String(rule.override.weight),
  );
  const signal = rule.kind === 'signal';
  const ownWeight = signal && weight.trim() !== '' ? Number(weight) : null;
  const weightOk =
    ownWeight === null ||
    (Number.isInteger(ownWeight) && ownWeight >= 0 && ownWeight <= RULE_WEIGHT_MAX);
  const done = (text: string) => () => {
    toast(text);
    router.back();
  };
  const fail = (e: Error) => toast(e.message);

  const save = () =>
    mode === null && ownWeight === null
      ? clear.mutate(
          { categoryId, code: rule.code },
          { onSuccess: done('Danh mục dùng lại giá trị chung'), onError: fail },
        )
      : set.mutate(
          {
            categoryId,
            code: rule.code,
            ...(mode === null ? {} : { mode }),
            ...(ownWeight === null ? {} : { weight: ownWeight }),
          },
          { onSuccess: done('Đã lưu luật riêng'), onError: fail },
        );

  return (
    <View style={styles.screen}>
      <OpsHeader back title={rule.label} sub={name ? `Riêng cho ${name}` : 'Luật riêng'} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.note}>
            Giá trị chung: {RULE_MODE_LABEL[rule.mode]}
            {signal ? ` · +${rule.weight} điểm` : ''}.
          </Text>
          <Text style={styles.label}>Chế độ</Text>
          <View style={styles.choices}>
            <Choice
              align="left"
              label={`Như chung (${RULE_MODE_LABEL[rule.mode]})`}
              selected={mode === null}
              onPress={() => setMode(null)}
            />
            {MODES.filter((m) => rule.kind !== 'gate' || m !== 'off').map((m) => (
              <Choice
                key={m}
                align="left"
                label={RULE_MODE_LABEL[m]}
                selected={mode === m}
                onPress={() => setMode(m)}
              />
            ))}
          </View>
          {signal && (
            <Field
              label={`Trọng số riêng (0–${RULE_WEIGHT_MAX})`}
              value={weight}
              onChangeText={setWeight}
              keyboardType="number-pad"
              placeholder={`Để trống = như chung (${rule.weight})`}
            />
          )}
          <PinButton
            label="Lưu luật riêng"
            disabled={!weightOk}
            loading={set.isPending || clear.isPending}
            onPress={save}
          />
          {rule.override && (
            <GhostButton
              label="Bỏ luật riêng — dùng giá trị chung"
              onPress={() =>
                clear.mutate(
                  { categoryId, code: rule.code },
                  { onSuccess: done('Danh mục dùng lại giá trị chung'), onError: fail },
                )
              }
            />
          )}
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
  label: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  choices: { gap: S.sm },
});
