import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { OutlineButton, type IconName } from './ui';
import { C, F, R, S } from '@/theme';

/** Một dòng có một nút: thiết bị đang đăng nhập, người đã chặn. Không có `action` = dòng chỉ để xem. */
export function ActionRow({
  icon,
  title,
  meta,
  action,
}: {
  icon: IconName;
  title: string;
  meta: string;
  action: { label: string; onPress: () => void } | null;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Feather name={icon} size={18} color={C.inkSoft} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      {action && <OutlineButton compact label={action.label} onPress={action.onPress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: R.sm,
    backgroundColor: C.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
});
