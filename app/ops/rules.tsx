import { SectionList, StyleSheet, Text, View } from 'react-native';
import { Chip } from '@/components/Chip';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading } from '@/components/ui';
import type { ScreeningRule } from '@/api/ops';
import { useScreeningRules, useSetRuleMode } from '@/queries/ops-rules';
import { C, F, R, S } from '@/theme';

const SECTIONS = [
  {
    kind: 'quality',
    title: 'Chất lượng ảnh',
    note: 'Bật thì giữ tin có ảnh lỗi cho người duyệt và báo người đăng ảnh nào cần thay. Không cộng điểm, không tính dò.',
  },
  {
    kind: 'gate',
    title: 'Cổng cứng',
    note: 'Trúng là giữ cho người ở mọi mức tin cậy và tính là dò. Chạy thử được, không tắt được.',
  },
  {
    kind: 'signal',
    title: 'Dấu hiệu',
    note: 'Cộng điểm rủi ro; tổng điểm quyết định dải Thấp, Vừa, Cao.',
  },
] as const;

const MODES: { mode: ScreeningRule['mode']; label: string }[] = [
  { mode: 'on', label: 'Bật' },
  { mode: 'trial', label: 'Chạy thử' },
  { mode: 'off', label: 'Tắt' },
];

/**
 * Luật máy duyệt (master). Chạy thử = máy vẫn chấm và ghi lại lượt trúng nhưng không đổi kết quả — cách để xem một luật
 * bắt nhầm bao nhiêu trước khi bật. Mỗi lần đổi là một phiên bản luật mới, có hiệu lực từ lượt gửi tin kế tiếp.
 */
export default function OpsRules() {
  const toast = useToast();
  const rules = useScreeningRules();
  const setMode = useSetRuleMode();

  const change = (rule: ScreeningRule, mode: ScreeningRule['mode']) => {
    if (rule.mode === mode) return;
    setMode.mutate(
      { code: rule.code, mode },
      {
        onSuccess: () => toast(`${rule.label}: ${MODES.find((m) => m.mode === mode)?.label}`),
        onError: (e) => toast(e.message),
      },
    );
  };

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Luật máy duyệt" sub="Có hiệu lực từ lượt gửi tin kế tiếp" />
      {rules.isPending ? (
        <Loading />
      ) : rules.isError ? (
        <EmptyState icon="lock" text={rules.error.message} />
      ) : (
        <SectionList
          sections={SECTIONS.map((s) => ({
            ...s,
            data: rules.data.filter((r) => r.kind === s.kind),
          }))}
          keyExtractor={(r) => r.code}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.section}>
              <Text style={styles.title}>{section.title}</Text>
              <Text style={styles.note}>{section.note}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                setMode.isPending && setMode.variables?.code === item.code && styles.busy,
              ]}
            >
              <View style={styles.head}>
                <Text style={styles.label}>{item.label}</Text>
                {item.kind === 'signal' && <Text style={styles.weight}>+{item.weight} điểm</Text>}
              </View>
              <View style={styles.modes}>
                {MODES.filter((m) => item.kind !== 'gate' || m.mode !== 'off').map((m) => (
                  <Chip
                    key={m.mode}
                    label={m.label}
                    selected={item.mode === m.mode}
                    onPress={() => change(item, m.mode)}
                  />
                ))}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  list: { padding: S.lg, gap: S.sm },
  section: { marginTop: S.md, gap: S.xs },
  title: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  note: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  card: {
    gap: S.sm,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  busy: { opacity: 0.5 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { flex: 1, fontFamily: F.uiBold, fontSize: 14, color: C.ink },
  weight: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  modes: { flexDirection: 'row', gap: S.sm },
});
