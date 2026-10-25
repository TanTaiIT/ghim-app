import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Avatar } from './Avatar';
import { Gallery } from './Gallery';
import { Price, Tag } from './ui';
import { REPORT_CATEGORY_LABEL } from '@/api/client';
import { QUEUE_LABEL, REASON_LABEL, hitLabel, type OpsTaskDetail } from '@/api/ops';
import { C, F, R, S } from '@/theme';
import { formatAgo, formatDue } from '@/utils/format';

/**
 * Bối cảnh của một việc như server trả (`GET /ops/review/tasks/:id`): tin như người đăng thấy, điều máy đã trúng, người
 * bán, ảnh trùng, tài khoản dùng chung máy, báo cáo, gậy, đoạn chat làm bằng chứng. Chỉ hiển thị — quyết định nằm ở
 * route.
 */
export function OpsTaskBody({
  task,
  category,
  onOpenPerson,
}: {
  task: OpsTaskDetail;
  category: string | null;
  onOpenPerson: (id: string, name: string | null) => void;
}) {
  const l = task.listing;
  const queue = QUEUE_LABEL[task.queue] ?? `Hàng ${task.queue}`;
  // Lý do làm nên chính hàng đó ("Máy giữ" / "Máy giữ tin", "Nhóm chuyển lên") đã nói ở nhãn hàng — bỏ để khỏi lặp.
  const reasons = task.reasons.filter((r) => !REASON_LABEL[r].startsWith(queue));
  return (
    <View>
      {l && l.pictures.length > 0 && <Gallery photos={l.pictures} height={250} />}
      <View style={styles.main}>
        <View style={styles.tags}>
          <Tag label={queue} tone="brand" />
          {reasons.map((r) => (
            <Tag
              key={r}
              label={REASON_LABEL[r]}
              tone={r.startsWith('report') ? 'boost' : 'neutral'}
            />
          ))}
          {category && <Tag label={category} />}
          <Tag
            label={formatDue(task.dueAt)}
            tone={task.overdue ? 'amber' : 'neutral'}
            icon="clock"
          />
        </View>

        {l && (
          <View style={styles.block}>
            <Text style={styles.title}>{l.title ?? 'Tin chưa có tiêu đề'}</Text>
            {l.price !== null && <Price value={l.price} size={22} />}
            {l.groupName && <Text style={styles.caption}>Trong nhóm {l.groupName}</Text>}
            {l.description && <Text style={styles.text}>{l.description}</Text>}
          </View>
        )}
        {task.listingDeleted && (
          <Note
            icon="trash-2"
            text="Người đăng đã xoá tin — chỉ quyết được báo cáo, không đổi được tin."
          />
        )}

        {task.machine && task.machine.hits.length > 0 && (
          <Section
            title={`Máy đã trúng${task.machine.score !== null ? ` · điểm ${task.machine.score}` : ''}`}
          >
            {task.machine.hits.map((h) => (
              <Check key={h} text={hitLabel(h)} />
            ))}
          </Section>
        )}

        <Section title={task.subject === 'account' ? 'Người bị báo cáo' : 'Người đăng'}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpenPerson(task.seller.id, task.seller.name)}
            style={styles.person}
          >
            <Avatar name={task.seller.name ?? '?'} size={44} />
            <View style={styles.personBody}>
              <Text style={styles.personName}>{task.seller.name ?? 'Tài khoản đã xoá'}</Text>
              <Text style={styles.caption}>
                Mức {task.seller.tier} · {task.seller.cleanListings} tin sạch ·{' '}
                {task.seller.strikesInForce} cảnh cáo đang tính
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={C.muted} />
          </Pressable>
        </Section>

        {task.duplicates.length > 0 && (
          <Note icon="copy" warn text={`Ảnh trùng tin của: ${names(task.duplicates)}`} />
        )}
        {task.sharedDevice.length > 0 && (
          <Note icon="smartphone" warn text={`Dùng chung máy với: ${names(task.sharedDevice)}`} />
        )}
        {task.escalationNote && (
          <Note icon="corner-up-right" text={`Nhóm chuyển lên: ${task.escalationNote}`} />
        )}

        {task.reports.length > 0 && (
          <Section title="Báo cáo">
            {task.reports.map((r) => (
              <View key={r.id} style={[styles.report, r.severe && styles.reportSevere]}>
                <View style={styles.tags}>
                  <Tag
                    label={r.severe ? 'Nghiêm trọng' : 'Thường'}
                    tone={r.severe ? 'boost' : 'neutral'}
                  />
                  <Tag label={`${r.reporterCount} người báo`} />
                  {r.autoHidden && <Tag label="Đang tạm ẩn" tone="amber" />}
                  {r.status !== 'open' && (
                    <Tag label={r.status === 'upheld' ? 'Đã xác nhận' : 'Đã bác'} tone="brand" />
                  )}
                </View>
                <Text style={styles.text}>
                  {r.categories.map((c) => REPORT_CATEGORY_LABEL[c]).join(' · ')}
                </Text>
                <Text style={styles.caption}>Lượt gần nhất {formatAgo(r.lastAt)}</Text>
              </View>
            ))}
          </Section>
        )}

        {task.strike && (
          <Section title="Cảnh cáo">
            <Text style={styles.text}>{task.strike.rule}</Text>
            <Text style={styles.caption}>
              {STRIKE_KIND[task.strike.kind]} · {task.strike.points} điểm · ra{' '}
              {formatAgo(task.strike.issuedAt)}
            </Text>
            {task.strike.statement && <Text style={styles.quote}>“{task.strike.statement}”</Text>}
          </Section>
        )}

        {task.evidence.map((c) => (
          <Section key={c.id} title="Đoạn chat bị báo cáo">
            {c.messages.map((m) => (
              <View
                key={m.id}
                style={[styles.bubble, m.fromSeller ? styles.bubbleSeller : styles.bubbleOther]}
              >
                <Text style={styles.bubbleText}>{m.body}</Text>
                <Text style={styles.caption}>
                  {m.fromSeller ? 'Người bị báo cáo' : 'Người kia'} · {formatAgo(m.at)}
                  {m.flagged ? ' · trúng cụm đáng ngờ' : ''}
                </Text>
              </View>
            ))}
          </Section>
        ))}
      </View>
    </View>
  );
}

const STRIKE_KIND = {
  normal: 'Cảnh cáo',
  severe: 'Cảnh cáo nặng',
  serious: 'Vi phạm nghiêm trọng',
} as const;

const names = (list: { name: string | null }[]) =>
  list.map((a) => a.name ?? 'tài khoản đã xoá').join(', ');

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Check({ text }: { text: string }) {
  return (
    <View style={styles.check}>
      <View style={styles.checkIcon}>
        <Feather name="alert-triangle" size={12} color={C.boostTx} />
      </View>
      <Text style={styles.checkText}>{text}</Text>
    </View>
  );
}

function Note({
  icon,
  text,
  warn = false,
}: {
  icon: 'copy' | 'smartphone' | 'corner-up-right' | 'trash-2';
  text: string;
  warn?: boolean;
}) {
  return (
    <View style={[styles.note, warn && styles.noteWarn]}>
      <Feather name={icon} size={16} color={warn ? C.price : C.inkSoft} />
      <Text style={[styles.noteText, warn && { color: C.warnTx }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  main: { padding: S.lg, gap: S.lg },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  block: { gap: S.xs },
  title: { fontFamily: F.uiBlack, fontSize: 20, lineHeight: 26, color: C.ink },
  text: { fontFamily: F.ui, fontSize: 14, lineHeight: 21, color: C.inkMid },
  caption: { fontFamily: F.uiMedium, fontSize: 12, color: C.inkSoft },
  quote: { fontFamily: F.ui, fontSize: 13, fontStyle: 'italic', color: C.inkMid },
  section: { gap: S.sm },
  sectionTitle: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: R.full,
    backgroundColor: C.boost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { flex: 1, fontFamily: F.ui, fontSize: 14, color: C.ink },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  personBody: { flex: 1, minWidth: 0, gap: 2 },
  personName: { fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  note: {
    flexDirection: 'row',
    gap: 10,
    padding: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.sand,
  },
  noteWarn: { borderColor: C.warnLine, backgroundColor: C.warnWash },
  noteText: { flex: 1, fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkMid },
  report: {
    gap: 6,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  reportSevere: { borderColor: C.warnLine },
  bubble: { maxWidth: '86%', gap: 2, padding: 10, borderRadius: R.md },
  bubbleSeller: { alignSelf: 'flex-start', backgroundColor: C.sand },
  bubbleOther: { alignSelf: 'flex-end', backgroundColor: C.brandWash },
  bubbleText: { fontFamily: F.ui, fontSize: 14, lineHeight: 20, color: C.ink },
});
