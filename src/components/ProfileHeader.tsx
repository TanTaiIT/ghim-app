import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { Me } from '@/api/client';
import { Avatar, Verified } from './Avatar';
import { IconButton, OutlineButton } from './ui';
import { C, F, R, S } from '@/theme';

/**
 * Đầu trang Cá nhân: danh tính và ba con số. Số tin do route đếm từ chính danh sách đang hiện. Email chưa xác nhận
 * thì nhắc ngay ở đây — tài khoản như thế bị server chặn đăng tin, tải ảnh, nhắn tin, vào nhóm. `verifiedDocument` =
 * loại giấy tờ đã được duyệt (CCCD, CMND, Hộ chiếu): `/me` không mang kết quả xác minh, route đọc riêng.
 */
export function ProfileHeader({
  me,
  verifiedDocument,
  active,
  sold,
  onSettings,
  onVerifyEmail,
}: {
  me: Me;
  verifiedDocument: string | null;
  active: number;
  sold: number;
  onSettings: () => void;
  onVerifyEmail: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.idRow}>
        <Avatar name={me.name} size={68} tone="solid" uri={me.avatarUrl} />
        <View style={styles.id}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{me.name}</Text>
            {me.verified && <Verified size={17} />}
          </View>
          <Text style={styles.small}>
            {verifiedDocument ? `Đã xác minh ${verifiedDocument} · ` : ''}Thành viên từ{' '}
            {me.memberSince}
          </Text>
        </View>
        <IconButton variant="outline" icon="sliders" label="Cài đặt" onPress={onSettings} />
      </View>
      <View style={styles.stats}>
        <Stat value={String(active)} label="Đang đăng" />
        <Stat value={String(sold)} label="Đã bán" />
        <Stat value={me.rating === null ? '—' : `${me.rating} ★`} label="Đánh giá" />
      </View>
      {!me.emailVerified && (
        <View style={styles.verify}>
          <Feather name="mail" size={18} color={C.warnTx} />
          <Text style={styles.verifyText}>
            Email chưa xác nhận. Xác nhận để đăng tin, nhắn tin và vào nhóm.
          </Text>
          <OutlineButton compact label="Xác nhận" onPress={onVerifyEmail} />
        </View>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.small}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
    paddingBottom: S.lg,
    gap: S.lg,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.paperWarm,
  },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  id: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: F.uiBlack, fontSize: 19, color: C.ink },
  small: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  stats: { flexDirection: 'row', gap: S.sm },
  stat: {
    flex: 1,
    padding: 10,
    gap: 2,
    alignItems: 'center',
    borderRadius: R.sm,
    backgroundColor: C.sand,
  },
  statValue: { fontFamily: F.uiBlack, fontSize: 18, color: C.ink },
  verify: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    padding: S.md,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.warnLine,
    backgroundColor: C.warnWash,
  },
  verifyText: { flex: 1, fontFamily: F.ui, fontSize: 13, lineHeight: 18, color: C.warnTx },
});
