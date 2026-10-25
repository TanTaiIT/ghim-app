import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Choice } from '@/components/Chip';
import { Field } from '@/components/Field';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, OutlineButton, PinButton } from '@/components/ui';
import { useCategoryTemplate } from '@/queries/catalog';
import { useOpsCategories, useSetCategorySettings } from '@/queries/ops-catalog';
import { RISK_LABEL, type CategorySettings, type OpsCategory, type RiskLevel } from '@/api/ops';
import { C, F, R, S } from '@/theme';
import { groupThousands, parseDigits } from '@/utils/format';

const RISKS = Object.keys(RISK_LABEL) as RiskLevel[];

const GROUP_REVIEW: { value: CategorySettings['groupReview']; label: string }[] = [
  { value: 'group', label: 'Điều hành viên của nhóm duyệt' },
  { value: 'platform', label: 'Staff của sàn duyệt (cả nhóm riêng tư)' },
];

/** Ô tiền: trống = không đặt; hiện có dấu chấm nghìn. */
const moneyText = (v: number | null) => (v === null ? '' : groupThousands(v));
const moneyOf = (text: string) => (text.trim() ? parseDigits(text) : null);

/**
 * Một danh mục (master): năm cài đặt máy duyệt — mỗi lần lưu là một phiên bản cài đặt mới — và lối vào soạn mẫu thông
 * tin. Ba cài đặt về giữ tin độc lập nhau (spec category-catalog): rủi ro cao chỉ cộng điểm, luôn duyệt tay giữ mọi tin,
 * và ai duyệt tin nhóm bị giữ.
 */
export default function OpsCategory() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const categories = useOpsCategories();
  const category = categories.data?.find((c) => c.id === id);

  if (categories.isPending) return <Loading />;
  if (!category) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Danh mục" />
        <EmptyState icon="layers" text={categories.error?.message ?? 'Không có danh mục này.'} />
      </View>
    );
  }
  // `key` theo phiên bản cài đặt: lưu xong server tạo bản mới, form dựng lại từ đó.
  return <CategoryForm key={category.settingsVersion} category={category} />;
}

function CategoryForm({ category: c }: { category: OpsCategory }) {
  const router = useRouter();
  const toast = useToast();
  const template = useCategoryTemplate(c.id).data;
  const save = useSetCategorySettings(c.id);
  const [priceCap, setPriceCap] = useState(moneyText(c.priceCap));
  const [referencePrice, setReferencePrice] = useState(moneyText(c.referencePrice));
  const [riskLevel, setRiskLevel] = useState(c.riskLevel);
  const [alwaysManual, setAlwaysManual] = useState(c.alwaysManual);
  const [groupReview, setGroupReview] = useState(c.groupReview);

  const next: CategorySettings = {
    priceCap: moneyOf(priceCap),
    referencePrice: moneyOf(referencePrice),
    riskLevel,
    alwaysManual,
    groupReview,
  };
  const dirty = (Object.keys(next) as (keyof CategorySettings)[]).some((k) => next[k] !== c[k]);

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title={c.name}
        sub={`${c.active ? 'Đang bật' : 'Đã tắt'} · cài đặt máy duyệt phiên bản ${c.settingsVersion}`}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>Cài đặt máy duyệt</Text>
          <Field
            label="Trần giá (đồng) — vượt là máy giữ tin"
            value={priceCap}
            onChangeText={(t) => setPriceCap(t.trim() ? groupThousands(parseDigits(t)) : '')}
            keyboardType="number-pad"
            placeholder="Để trống = không đặt trần"
          />
          <Field
            label="Giá tham chiếu (đồng)"
            value={referencePrice}
            onChangeText={(t) => setReferencePrice(t.trim() ? groupThousands(parseDigits(t)) : '')}
            keyboardType="number-pad"
            placeholder="Để trống = không có"
          />
          <Text style={styles.label}>Mức rủi ro</Text>
          <View style={styles.row}>
            {RISKS.map((r) => (
              <Choice
                key={r}
                label={RISK_LABEL[r]}
                selected={r === riskLevel}
                onPress={() => setRiskLevel(r)}
              />
            ))}
          </View>
          <Check
            checked={alwaysManual}
            label="Luôn duyệt tay — mọi tin của danh mục chờ người duyệt"
            onPress={() => setAlwaysManual((v) => !v)}
          />
          <Text style={styles.label}>Tin nhóm bị máy giữ</Text>
          <View style={styles.choices}>
            {GROUP_REVIEW.map((g) => (
              <Choice
                key={g.value}
                align="left"
                label={g.label}
                selected={g.value === groupReview}
                onPress={() => setGroupReview(g.value)}
              />
            ))}
          </View>
          <PinButton
            label="Lưu cài đặt"
            disabled={!dirty}
            loading={save.isPending}
            onPress={() =>
              save.mutate(next, {
                onSuccess: () => toast('Đã lưu — máy duyệt dùng phiên bản cài đặt mới'),
                onError: (e) => toast(e.message),
              })
            }
          />

          <Text style={styles.section}>Mẫu thông tin</Text>
          <View style={styles.card}>
            <Text style={styles.meta}>
              {c.templateVersion
                ? `Phiên bản hiện hành v${c.templateVersion} · ${template?.length ?? '…'} mục`
                : 'Chưa phát hành mẫu nào — tin đăng chỉ có các ô chung.'}
            </Text>
            <OutlineButton
              compact
              label="Soạn mẫu thông tin"
              onPress={() =>
                router.push({ pathname: '/ops/category/template/[id]', params: { id: c.id } })
              }
            />
          </View>
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
  label: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  row: { flexDirection: 'row', gap: S.sm },
  choices: { gap: S.sm },
  card: {
    gap: S.sm,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  meta: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
});
