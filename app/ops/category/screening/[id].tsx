import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Field } from '@/components/Field';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, OutlineButton, PinButton } from '@/components/ui';
import {
  RULE_MODE_LABEL,
  RULE_WEIGHT_MAX,
  type Bands,
  type CategoryRule,
  type CategoryScreening,
} from '@/api/ops-screening';
import { useCategoryScreening, useSetBands } from '@/queries/ops-screening';
import { C, F, R, S } from '@/theme';

/** Một dòng "chung → riêng" của luật: chỉ phần danh mục này đè lên mới hiện ở dòng riêng. */
function describe(r: CategoryRule): { base: string; own: string | null } {
  const points = (w: number) => (r.kind === 'signal' ? ` · +${w} điểm` : '');
  const base = `${RULE_MODE_LABEL[r.mode]}${points(r.weight)}`;
  if (!r.override) return { base, own: null };
  const mode = r.override.mode ?? r.mode;
  const weight = r.override.weight ?? r.weight;
  return { base, own: `${RULE_MODE_LABEL[mode]}${points(weight)}` };
}

/**
 * Máy duyệt riêng một danh mục (master, spec screening/rule-management): ngưỡng dải Vừa / Cao, và trọng số hay chế độ
 * riêng của từng luật. Không đặt gì thì danh mục dùng giá trị chung; mỗi lần đổi là một phiên bản luật mới.
 */
export default function OpsCategoryScreening() {
  const { id = '', name = '' } = useLocalSearchParams<{ id: string; name?: string }>();
  const screening = useCategoryScreening(id);

  if (screening.isPending) return <Loading />;
  if (screening.isError) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Máy duyệt của danh mục" />
        <EmptyState icon="sliders" text={screening.error.message} />
      </View>
    );
  }
  const s = screening.data;
  return (
    <Body key={`${s.bands?.mediumFrom}-${s.bands?.highFrom}`} id={id} name={name} screening={s} />
  );
}

function Body({
  id,
  name,
  screening: s,
}: {
  id: string;
  name: string;
  screening: CategoryScreening;
}) {
  const router = useRouter();
  const toast = useToast();
  const setBands = useSetBands();
  const start: Bands = s.bands ?? s.defaultBands;
  const [medium, setMedium] = useState(String(start.mediumFrom));
  const [high, setHigh] = useState(String(start.highFrom));
  const next = { mediumFrom: Number(medium), highFrom: Number(high) };
  const valid =
    Number.isInteger(next.mediumFrom) &&
    Number.isInteger(next.highFrom) &&
    next.mediumFrom >= 1 &&
    next.mediumFrom < next.highFrom &&
    next.highFrom <= RULE_WEIGHT_MAX * 10;
  const dirty = next.mediumFrom !== start.mediumFrom || next.highFrom !== start.highFrom;

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Máy duyệt của danh mục" sub={name} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>Ngưỡng điểm</Text>
          <Text style={styles.note}>
            {s.bands
              ? `Danh mục đang dùng ngưỡng riêng. Ngưỡng chung: Vừa từ ${s.defaultBands.mediumFrom}, Cao từ ${s.defaultBands.highFrom}.`
              : `Đang dùng ngưỡng chung: Vừa từ ${s.defaultBands.mediumFrom}, Cao từ ${s.defaultBands.highFrom} điểm.`}
          </Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Field
                label="Dải Vừa từ"
                value={medium}
                onChangeText={setMedium}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.flex}>
              <Field
                label="Dải Cao từ"
                value={high}
                onChangeText={setHigh}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <PinButton
            label="Lưu ngưỡng riêng"
            disabled={!dirty || !valid}
            loading={setBands.isPending}
            onPress={() =>
              setBands.mutate(
                { categoryId: id, ...next },
                { onSuccess: () => toast('Đã lưu ngưỡng riêng'), onError: (e) => toast(e.message) },
              )
            }
          />

          <Text style={styles.section}>Từ khoá</Text>
          <View style={styles.card}>
            <Text style={styles.note}>
              Máy suy ra danh mục thật của tin từ tiêu đề; khác danh mục người đăng chọn là trúng
              "sai danh mục".
            </Text>
            <OutlineButton
              compact
              label="Sửa từ khoá"
              onPress={() =>
                router.push({ pathname: '/ops/category/keywords/[id]', params: { id, name } })
              }
            />
          </View>

          <Text style={styles.section}>Luật riêng</Text>
          <Text style={styles.note}>
            Bấm một luật để đặt trọng số hay chế độ riêng cho danh mục này.
          </Text>
          {s.rules.map((r) => {
            const { base, own } = describe(r);
            return (
              <Pressable
                key={r.code}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/ops/category/rule',
                    params: { categoryId: id, code: r.code, name },
                  })
                }
                style={[styles.card, own !== null && styles.cardOwn]}
              >
                <Text style={styles.label}>{r.label}</Text>
                <Text style={styles.meta}>Chung: {base}</Text>
                {own !== null && <Text style={styles.own}>Riêng: {own}</Text>}
              </Pressable>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.md },
  section: { marginTop: S.sm, fontFamily: F.uiBold, fontSize: 16, color: C.ink },
  note: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  row: { flexDirection: 'row', gap: S.md },
  card: {
    gap: S.xs,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  cardOwn: { borderColor: C.brand },
  label: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  own: { fontFamily: F.uiSemi, fontSize: 12, color: C.brandDark },
});
