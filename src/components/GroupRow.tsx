import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Tag } from './ui';
import { C, F, R, S, TONE } from '@/theme';

/**
 * Một dòng nhóm ở "Nhóm của tôi": nhóm đang ở, kết quả tìm, nhóm tìm bằng mã, lời mời. Lời mời cần hai nút nên
 * nút đi qua `children`, nằm dưới dòng tên; dòng có `onPress` thì cả dòng mở trang nhóm.
 */
export function GroupRow({
  name,
  initials,
  meta,
  tag,
  onPress,
  children,
}: {
  name: string;
  initials: string;
  meta: string;
  tag?: string;
  onPress?: () => void;
  children?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'link' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta} numberOfLines={2}>
            {meta}
          </Text>
        </View>
        {tag && <Tag label={tag} tone="brand" />}
        {onPress && <Feather name="chevron-right" size={18} color={C.muted} />}
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  badge: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: TONE.dusk.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: F.uiBold, fontSize: 14, color: TONE.dusk.fg },
  body: { flex: 1, gap: 2 },
  name: { fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
});
