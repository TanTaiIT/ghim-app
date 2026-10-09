import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { Group } from '@/api/client';
import { Photo } from './Photo';
import { IconButton } from './ui';
import { C, F, R, S, TONE } from '@/theme';
import { groupThousands } from '@/utils/format';

/**
 * Đầu trang nhóm: ảnh bìa với nút lùi/chia sẻ, ảnh đại diện đè lên mép bìa, tên, số thành viên và hai
 * nút Tham gia / Nhắn admin. Hành động đi ra bằng callback — mutation khởi phát từ route.
 */
export function GroupHeader({
  group: g,
  topInset,
  onBack,
  onShare,
  onToggleJoin,
  onMessageAdmin,
}: {
  group: Group;
  topInset: number;
  onBack: () => void;
  onShare: () => void;
  onToggleJoin: () => void;
  onMessageAdmin: () => void;
}) {
  const open = g.visibility === 'public';
  return (
    <>
      <View>
        <Photo picture={g.cover} style={styles.cover} />
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
            <Feather name={open ? 'globe' : 'lock'} size={14} color={C.inkSoft} />
            <Text style={styles.meta}>
              {open ? 'Nhóm công khai' : 'Nhóm kín'} · {groupThousands(g.memberCount)} thành viên
            </Text>
          </View>
        </View>
        <View style={styles.buttons}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: g.joined }}
            onPress={onToggleJoin}
            style={[styles.join, g.joined && styles.joined]}
          >
            <Text style={[styles.joinText, g.joined && styles.joinedText]}>
              {g.joined ? 'Đã tham gia' : 'Tham gia nhóm'}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onMessageAdmin} style={styles.admin}>
            <Text style={styles.adminText}>Nhắn admin</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  cover: { height: 150 },
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
  buttons: { flexDirection: 'row', gap: S.sm },
  join: {
    flex: 1,
    height: 46,
    borderRadius: R.md,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joined: { borderWidth: 1.5, borderColor: C.brand, backgroundColor: C.brandLt },
  joinText: { fontFamily: F.uiBold, fontSize: 15, color: C.paperWarm },
  joinedText: { color: C.brandDark },
  admin: {
    height: 46,
    paddingHorizontal: S.lg,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.lineStrong,
    backgroundColor: C.paperWarm,
    justifyContent: 'center',
  },
  adminText: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
});
