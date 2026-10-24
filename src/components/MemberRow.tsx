import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { Tag } from './ui';
import { C, F, R, S } from '@/theme';

/**
 * Một người trong nhóm: thành viên, người xin vào, người bị cấm. Nút đi qua `children`, nằm dưới dòng tên — một dòng
 * có thể cần hai nút (duyệt / từ chối) mà tên dài vẫn phải còn chỗ.
 */
export function MemberRow({
  name,
  meta,
  tag,
  children,
}: {
  name: string;
  meta?: string;
  tag?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.card}>
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
      </View>
      {children}
    </View>
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
