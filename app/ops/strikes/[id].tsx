import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { Check } from '@/components/Chip';
import { InputSheet } from '@/components/InputSheet';
import { OpsHeader } from '@/components/OpsHeader';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, OutlineButton, Tag } from '@/components/ui';
import { STRIKE_KIND_LABEL, STRIKE_STATUS_LABEL, type OpsStrike } from '@/api/ops';
import { useAccountStrikes } from '@/queries/ops-people';
import { useAmnesty, useLiftPermanent } from '@/queries/ops-admin';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/** Ân xá được: cảnh cáo thường hay nặng còn đang tính. Vi phạm nghiêm trọng đi đường master quyết riêng. */
const pardonable = (s: OpsStrike) => s.kind !== 'serious' && s.status === 'active';

/**
 * Ân xá và gỡ khoá vĩnh viễn (master, spec trust/strikes): chọn các cảnh cáo đang tính để xoá cùng một lý do; khoá vĩnh
 * viễn thì gỡ — tài khoản mở khoá, email thôi bị chặn. Người đó được báo, lý do vào nhật ký vận hành.
 */
export default function OpsStrikes() {
  const { id = '', name = '' } = useLocalSearchParams<{ id: string; name?: string }>();
  const toast = useToast();
  const strikes = useAccountStrikes(id);
  const amnesty = useAmnesty(id);
  const lift = useLiftPermanent(id);
  const [picked, setPicked] = useState<string[]>([]);
  const [sheet, setSheet] = useState<'amnesty' | OpsStrike | null>(null);

  const toggle = (strikeId: string) =>
    setPicked((now) =>
      now.includes(strikeId) ? now.filter((x) => x !== strikeId) : [...now, strikeId],
    );

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Ân xá / gỡ khoá" sub={name} />
      {strikes.isPending ? (
        <Loading />
      ) : strikes.isError ? (
        <EmptyState icon="alert-circle" text={strikes.error.message} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.note}>
            Chọn cảnh cáo đang tính để ân xá. Khoá vĩnh viễn gỡ riêng từng cái.
          </Text>
          {strikes.data.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={styles.tags}>
                <Tag
                  label={STRIKE_KIND_LABEL[s.kind]}
                  tone={s.kind === 'normal' ? 'neutral' : 'boost'}
                />
                <Tag label={STRIKE_STATUS_LABEL[s.status]} tone={s.inForce ? 'amber' : 'neutral'} />
              </View>
              <Text style={styles.rule}>{s.rule}</Text>
              <Text style={styles.meta}>
                {s.points} điểm · ra {formatAgo(s.issuedAt)}
              </Text>
              {pardonable(s) && (
                <Check
                  checked={picked.includes(s.id)}
                  label="Ân xá cảnh cáo này"
                  onPress={() => toggle(s.id)}
                />
              )}
              {s.status === 'permanent' && (
                <OutlineButton compact label="Gỡ khoá vĩnh viễn" onPress={() => setSheet(s)} />
              )}
            </View>
          ))}
        </ScrollView>
      )}
      <ActionBar note={null}>
        <BarButton
          label={picked.length > 0 ? `Ân xá ${picked.length} cảnh cáo` : 'Ân xá'}
          disabled={picked.length === 0}
          loading={amnesty.isPending}
          onPress={() => setSheet('amnesty')}
        />
      </ActionBar>
      <InputSheet
        visible={sheet === 'amnesty'}
        title={`Ân xá ${picked.length} cảnh cáo?`}
        note="Cảnh cáo thôi tính điểm ngay; người này được báo. Lý do vào nhật ký vận hành."
        label="Lý do ân xá"
        confirmLabel="Ân xá"
        minLength={3}
        busy={amnesty.isPending}
        onClose={() => setSheet(null)}
        onSubmit={(reason) =>
          amnesty.mutate(
            { accountId: id, strikeIds: picked, reason: reason.trim() },
            {
              onSuccess: () => {
                setSheet(null);
                setPicked([]);
                toast('Đã ân xá');
              },
              onError: (e) => toast(e.message),
            },
          )
        }
      />
      <ConfirmSheet
        visible={typeof sheet === 'object' && sheet !== null}
        title="Gỡ khoá vĩnh viễn?"
        confirmLabel="Gỡ khoá vĩnh viễn"
        note="Tài khoản mở khoá, email thôi bị chặn đăng ký lại; người này được báo"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          typeof sheet === 'object' &&
          sheet !== null &&
          lift.mutate(sheet.id, {
            onSuccess: () => toast('Đã gỡ khoá vĩnh viễn'),
            onError: (e) => toast(e.message),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  note: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  card: {
    gap: 6,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rule: { fontFamily: F.ui, fontSize: 14, lineHeight: 20, color: C.ink },
  meta: { fontFamily: F.uiMedium, fontSize: 12, color: C.inkSoft },
});
