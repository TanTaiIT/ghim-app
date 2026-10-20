import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { IconName } from './ui';
import { C, F, R, S } from '@/theme';

export type MenuItem = { icon: IconName; label: string; onPress: () => void };

/** Khối mục bấm được, mỗi dòng một biểu tượng và mũi tên — menu ở trang Cá nhân và Cài đặt. */
export function MenuList({ items }: { items: MenuItem[] }) {
  return (
    <View style={styles.menu}>
      {items.map((m, i) => (
        <Pressable
          key={m.label}
          accessibilityRole="link"
          onPress={m.onPress}
          style={[styles.item, i < items.length - 1 && styles.line]}
        >
          <View style={styles.icon}>
            <Feather name={m.icon} size={17} color={C.brand} />
          </View>
          <Text style={styles.label}>{m.label}</Text>
          <Feather name="chevron-right" size={16} color={C.muted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    marginTop: S.xs,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  line: { borderBottomWidth: 1, borderBottomColor: C.line },
  icon: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    backgroundColor: C.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontFamily: F.uiMedium, fontSize: 14, color: C.ink },
});
