import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Avatar } from './Avatar';
import { Tag } from './ui';
import { C, F, R, S } from '@/theme';

/**
 * Một người trong nhóm: thành viên, người xin vào, người bị cấm. Nút đi qua `children`, nằm dưới dòng tên — một dòng
 * có thể cần hai nút (duyệt / từ chối) mà tên dài vẫn phải còn chỗ. Có `onPress` thì cả dòng mở trang của người đó.
 */
export function MemberRow({
  name,
  meta,
  tag,
  onPress,
  children,
}: {
  name: string;
  meta?: string;
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
        <Avatar name={name} size={40} />
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {meta && (
            <Text style={styles.meta} numberOfLines={2}>
              {meta}
            </Text>
          )}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
});
