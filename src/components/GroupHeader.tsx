import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { SvgXml } from 'react-native-svg';
import { isPublicGroup, type Group, type GroupMode, type GroupState } from '@/api/client';
import { IconButton } from './ui';
import { C, F, R, S, TONE } from '@/theme';
import { groupThousands } from '@/utils/format';

const MODE_LABEL: Record<GroupMode, string> = {
  public_open: 'Công khai · mở cửa',
  public_review: 'Công khai · xét duyệt',
  private_code: 'Riêng tư · có mã',
  private_invite: 'Riêng tư · chỉ lời mời',
};

/** Trạng thái làm nút "vào nhóm" không dùng được — nói trước, đừng để người xem bấm rồi mới nhận lỗi. */
const STATE_NOTE: Partial<Record<GroupState, string>> = {
  locked: 'Nhóm đang tạm khoá: chỉ xem được, chưa nhận thành viên hay tin mới.',
  going_private: 'Nhóm đang chuyển sang riêng tư, tạm chưa nhận thành viên mới.',
  pending_owner: 'Nhóm đang chờ giao chủ, chưa nhận thành viên.',
};

/**
 * Đầu trang nhóm: bìa, ô chữ cái đè lên mép bìa, tên, chế độ và số thành viên. Nút hành động do route truyền
 * vào (`children`) vì mutation khởi phát từ route. Server không có ảnh bìa nhóm: mọi nhóm dùng tranh bìa của bộ UI.
 */
export function GroupHeader({
  group: g,
  topInset,
  onBack,
  onShare,
  children,
}: {
  group: Group;
  topInset: number;
  onBack: () => void;
  onShare: () => void;
  children: ReactNode;
}) {
  const note = g.visible ? STATE_NOTE[g.state] : undefined;
  const reason = g.visible && g.state === 'locked' ? g.lockedReason : null;
  return (
    <>
      <View style={styles.cover}>
        <SvgXml xml={COVER_ART} width="100%" height="100%" />
        <View style={[styles.coverBar, { top: topInset + S.xs }]}>
          <IconButton variant="glass" icon="chevron-left" label="Quay lại" onPress={onBack} />
          <IconButton variant="glass" icon="share" label="Chia sẻ nhóm" onPress={onShare} />
        </View>
      </View>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{g.initials}</Text>
        </View>
        <View style={styles.title}>
          <Text style={styles.name}>{g.name}</Text>
          <View style={styles.metaRow}>
            <Feather
              name={g.visible && isPublicGroup(g.mode) ? 'globe' : 'lock'}
              size={14}
              color={C.inkSoft}
            />
            <Text style={styles.meta}>
              {g.visible
                ? `${MODE_LABEL[g.mode]} · ${groupThousands(g.memberCount)} thành viên`
                : 'Nhóm riêng tư'}
            </Text>
          </View>
        </View>
        {note && (
          <View style={styles.note}>
            <Feather name="alert-circle" size={16} color={C.warnTx} />
            <Text style={styles.noteText}>{reason ? `${note} Lý do: ${reason}` : note}</Text>
          </View>
        )}
        {children}
      </View>
    </>
  );
}

const COVER_ART =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 150" preserveAspectRatio="xMidYMid slice"><defs>' +
  '<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d3557"/><stop offset=".55" stop-color="#e07a5f"/><stop offset="1" stop-color="#f2cc8f"/></linearGradient></defs>' +
  '<rect width="390" height="150" fill="url(#s)"/><circle cx="292" cy="104" r="26" fill="#ffe2a8" opacity=".9"/>' +
  '<path d="M0 150 V112 H22 V96 H40 V118 H58 V84 H72 V70 H80 V84 H92 V120 H112 V100 H130 V124 H150 V92 H164 V108 H180 V128 H198 V60 L206 40 L214 60 V128 H232 V104 H252 V118 H270 V96 H288 V126 H306 V88 H324 V114 H344 V100 H362 V122 H390 V150z" fill="#16243a" opacity=".92"/>' +
  '<rect y="136" width="390" height="14" fill="#16243a"/>' +
  '<path d="M0 142 H390" stroke="#f2cc8f" stroke-opacity=".35" stroke-width="2" stroke-dasharray="14 10"/></svg>';

const styles = StyleSheet.create({
  cover: { height: 150, backgroundColor: TONE.dusk.bg },
  coverBar: {
    position: 'absolute',
    left: S.md,
    right: S.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  head: { marginTop: -36, paddingHorizontal: S.lg, gap: S.md },
  badge: {
    width: 72,
    height: 72,
    borderRadius: R.lg,
    borderWidth: 4,
    borderColor: C.paper,
    backgroundColor: TONE.dusk.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: F.uiBlack, fontSize: 24, color: TONE.dusk.fg },
  title: { gap: S.xs },
  name: { fontFamily: F.uiBlack, fontSize: 22, color: C.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontFamily: F.ui, fontSize: 13, color: C.inkSoft },
  note: {
    flexDirection: 'row',
    gap: S.sm,
    padding: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.warnLine,
    backgroundColor: C.warnWash,
  },
  noteText: { flex: 1, fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.warnTx },
});
