import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { Group, GroupState } from '@/api/client';
import { PinButton } from './ui';
import { C, F, R, S } from '@/theme';
import { daysUntil } from '@/utils/format';

/** `ACCEPTS_MEMBERS` của server — trạng thái khác trả 409 cho mọi lượt vào. */
const ACCEPTING: ReadonlySet<GroupState> = new Set(['active', 'ownerless']);

export type GroupAction =
  | { kind: 'member' }
  | { kind: 'pending'; expiresAt: string }
  | { kind: 'invited'; invitationId: string }
  | { kind: 'join' }
  | { kind: 'request'; code: string | undefined }
  | { kind: 'code' }
  | { kind: 'closed' };

/**
 * Đường vào hợp với người xem, theo thứ tự server xét: đã vào → đơn đang chờ → nhóm không nhận người → lời mời
 * → danh sách lớp → chế độ. Người ngoài nhóm riêng tư không biết nhóm có mã hay chỉ lời mời: đưa ô nhập mã, còn
 * lời mời đã hiện ở bước trước nếu có.
 */
export function actionOf(
  g: Group,
  invitationId: string | null,
  onRoster: boolean,
  code: string | undefined,
): GroupAction {
  if (g.visible && g.role) return { kind: 'member' };
  if (g.joinRequest) return { kind: 'pending', expiresAt: g.joinRequest.expiresAt };
  if (g.visible && !ACCEPTING.has(g.state)) return { kind: 'closed' };
  if (invitationId) return { kind: 'invited', invitationId };
  if (onRoster || (g.visible && g.mode === 'public_open')) return { kind: 'join' };
  if (code || (g.visible && g.mode === 'public_review')) return { kind: 'request', code };
  return { kind: 'code' };
}

const PRIMARY: Record<GroupAction['kind'], string> = {
  member: 'Đã tham gia',
  pending: 'Đơn đang chờ duyệt',
  invited: 'Nhận lời mời',
  join: 'Tham gia nhóm',
  request: 'Gửi đơn xin vào',
  code: 'Nhập mã nhóm',
  closed: 'Chưa vào được lúc này',
};

const SECONDARY: Partial<Record<GroupAction['kind'], string>> = {
  pending: 'Rút đơn',
  invited: 'Từ chối',
};

function captionOf(a: GroupAction): string | null {
  switch (a.kind) {
    case 'pending':
      return `Đơn tự huỷ sau ${daysUntil(a.expiresAt)} ngày nếu chưa ai xử.`;
    case 'request':
      return 'Quản trị nhóm duyệt đơn rồi bạn mới thành thành viên.';
    case 'invited':
      return 'Quản trị nhóm đã mời bạn vào nhóm này.';
    case 'code':
      return 'Nhóm riêng tư: vào bằng mã nhóm, hoặc bằng lời mời của quản trị nhóm.';
    default:
      return null;
  }
}

/**
 * Hàng nút dưới tên nhóm. Chỉ vẽ và báo lượt bấm — lượt ghi khởi phát từ route. "Đã tham gia" mở menu thành viên
 * (tắt tiếng, rời nhóm); hai trạng thái chờ không bấm được, chỉ có nút phụ.
 */
export function GroupActions({
  action,
  busy,
  canMessageAdmin,
  onPrimary,
  onSecondary,
  onMessageAdmin,
}: {
  action: GroupAction;
  busy: boolean;
  canMessageAdmin: boolean;
  onPrimary: () => void;
  onSecondary: () => void;
  onMessageAdmin: () => void;
}) {
  const label = PRIMARY[action.kind];
  const secondary = SECONDARY[action.kind];
  const caption = captionOf(action);
  const still = action.kind === 'pending' || action.kind === 'closed';
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {action.kind === 'member' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Tắt tiếng hoặc rời nhóm"
            onPress={onPrimary}
            style={[styles.primary, styles.joined]}
          >
            <Text style={styles.joinedText}>{label}</Text>
            <Feather name="chevron-down" size={18} color={C.brandDark} />
          </Pressable>
        ) : still ? (
          <View style={[styles.primary, styles.still]}>
            <Text style={styles.stillText}>{label}</Text>
          </View>
        ) : (
          <View style={styles.flex}>
            <PinButton label={label} loading={busy} onPress={onPrimary} />
          </View>
        )}
        {secondary && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onSecondary}
            style={styles.side}
          >
            <Text style={styles.sideText}>{secondary}</Text>
          </Pressable>
        )}
        {canMessageAdmin && !secondary && (
          <Pressable accessibilityRole="button" onPress={onMessageAdmin} style={styles.side}>
            <Text style={styles.sideText}>Nhắn admin</Text>
          </Pressable>
        )}
      </View>
      {caption && <Text style={styles.caption}>{caption}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.sm },
  row: { flexDirection: 'row', gap: S.sm },
  flex: { flex: 1 },
  primary: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 46,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joined: { borderWidth: 1.5, borderColor: C.brand, backgroundColor: C.brandLt },
  joinedText: { fontFamily: F.uiBold, fontSize: 15, color: C.brandDark },
  still: { backgroundColor: C.sand },
  stillText: { fontFamily: F.uiBold, fontSize: 15, color: C.inkSoft },
  side: {
    height: 46,
    paddingHorizontal: S.lg,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.lineStrong,
    backgroundColor: C.paperWarm,
    justifyContent: 'center',
  },
  sideText: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  caption: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
});
