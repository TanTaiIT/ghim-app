import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { OutlineButton, Tag } from './ui';
import {
  FLAG_KIND_LABEL,
  HOLD_CAUSE_LABEL,
  HOLD_OUTCOME_LABEL,
  RISK_LABEL,
  type DeviceFlag,
  type HoldLookup,
} from '@/api/ops';
import { C, F, R, S } from '@/theme';
import { formatAgo, formatDate } from '@/utils/format';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * Lý do cụ thể của một lần máy giữ (spec explanations): kết quả, nguyên nhân, điểm, từng dấu hiệu trúng (luật đang chạy
 * thử thì ghi rõ — nó không tính điểm), và đánh dấu thiết bị đang mở kèm mã để tra tiếp. Không có dấu thiết bị nào.
 */
export function HoldResult({
  hold: h,
  onOpenPerson,
  onLookup,
}: {
  hold: HoldLookup;
  onOpenPerson: (id: string) => void;
  onLookup: (code: string) => void;
}) {
  return (
    <Card title={`Lần máy giữ · ${h.code}`}>
      <View style={styles.tags}>
        <Tag
          label={HOLD_OUTCOME_LABEL[h.outcome]}
          tone={h.outcome === 'hold' ? 'amber' : 'brand'}
        />
        <Tag label={HOLD_CAUSE_LABEL[h.cause]} />
        <Tag label={`Mức ${h.tier}`} />
      </View>
      <Text style={styles.meta}>
        {h.score !== null ? `Điểm ${h.score} · ${RISK_LABEL[h.band].toLowerCase()} · ` : ''}máy
        quyết {formatAgo(h.decidedAt)}
      </Text>
      {h.hits.map((hit) => (
        <View key={hit.code} style={styles.hit}>
          <Text style={styles.hitLabel}>
            {hit.label} · {hit.weight > 0 ? `+${hit.weight}` : hit.weight}
            {hit.trial ? ' · đang chạy thử, không tính' : ''}
          </Text>
          {hit.phrases.length > 0 && (
            <Text style={styles.meta}>Cụm từ: {hit.phrases.join(', ')}</Text>
          )}
        </View>
      ))}
      {h.deviceFlags.map((f) => (
        <Pressable
          key={f.label}
          accessibilityRole={f.flagCode ? 'link' : undefined}
          disabled={!f.flagCode}
          onPress={() => f.flagCode && onLookup(f.flagCode)}
          style={styles.flagRow}
        >
          <Feather name="smartphone" size={16} color={C.warnTx} />
          <Text style={styles.flagText}>
            {f.label}
            {f.flagCode ? ` · mã ${f.flagCode}` : ' · đã gỡ'}
          </Text>
          {f.flagCode && <Feather name="chevron-right" size={16} color={C.muted} />}
        </Pressable>
      ))}
      <OutlineButton compact label="Hồ sơ người đăng" onPress={() => onOpenPerson(h.accountId)} />
    </Card>
  );
}

/**
 * Một đánh dấu theo thiết bị (spec device-registry): loại, tài khoản bị đánh dấu, tài khoản liên quan, đang mở hay đã gỡ.
 * Gỡ khi đúng là nhầm — vd người dùng vừa mua lại máy cũ — kèm lý do.
 */
export function FlagResult({
  flag: f,
  onOpenPerson,
  onClear,
}: {
  flag: DeviceFlag;
  onOpenPerson: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <Card title={`Đánh dấu thiết bị · ${f.code}`}>
      <View style={styles.tags}>
        <Tag label={FLAG_KIND_LABEL[f.kind]} tone="amber" />
        <Tag label={f.clearedAt ? 'Đã gỡ' : 'Đang mở'} tone={f.clearedAt ? 'neutral' : 'boost'} />
      </View>
      <Text style={styles.meta}>
        Đánh dấu ngày {formatDate(f.createdAt)}
        {f.clearedAt ? ` · gỡ ngày ${formatDate(f.clearedAt)}: ${f.clearedReason ?? ''}` : ''}
      </Text>
      <View style={styles.actions}>
        <OutlineButton
          compact
          label="Tài khoản bị đánh dấu"
          onPress={() => onOpenPerson(f.accountId)}
        />
        {f.relatedAccountId && (
          <OutlineButton
            compact
            label="Tài khoản liên quan"
            onPress={() => f.relatedAccountId && onOpenPerson(f.relatedAccountId)}
          />
        )}
      </View>
      {!f.clearedAt && <OutlineButton label="Gỡ đánh dấu" onPress={onClear} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: S.sm,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  title: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: S.xs },
  meta: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  hit: { gap: 2, paddingVertical: S.xs, borderTopWidth: 1, borderTopColor: C.line },
  hitLabel: { fontFamily: F.uiSemi, fontSize: 13, color: C.ink },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.sm,
    borderRadius: R.md,
    backgroundColor: C.warnWash,
  },
  flagText: { flex: 1, fontFamily: F.uiMedium, fontSize: 13, color: C.warnTx },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
});
