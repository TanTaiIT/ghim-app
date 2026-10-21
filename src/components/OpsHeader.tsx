import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from './ui';
import { C, F, R, S } from '@/theme';

/*
 * Header tối của bàn vận hành (bộ UI "Chợ Đồ Cũ Admin"). Nền tối cố ý khác hẳn app người dùng: người duyệt bấm nhầm
 * nút "Gỡ tin" vì tưởng mình đang ở màn xem tin là lỗi đắt nhất ở khu này.
 */

/** Quay lại trong khu quản trị; mở thẳng bằng đường dẫn thì về Tổng quan của khu, không văng ra app người dùng. */
export function useOpsBack() {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace('/ops/home'));
}

export function OpsHeader({
  title,
  sub,
  role,
  back = false,
  right,
  children,
}: {
  title: string;
  sub?: string;
  /** Nhãn vai ("Master", "Staff") — chỉ hiện ở Tổng quan. */
  role?: string;
  back?: boolean;
  right?: ReactNode;
  /** Ô thống kê, ô lọc nằm trong phần nền tối. */
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const goBack = useOpsBack();
  return (
    <View style={[styles.header, { paddingTop: insets.top + S.md }]}>
      <View style={styles.row}>
        {back && (
          <IconButton icon="chevron-left" label="Quay lại" variant="glass" onPress={goBack} />
        )}
        <View style={styles.titles}>
          {role && (
            <View style={styles.role}>
              <Feather name="shield" size={12} color={C.brandDark} />
              <Text style={styles.roleText}>{role}</Text>
            </View>
          )}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {sub && <Text style={styles.sub}>{sub}</Text>}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export type OpsStat = {
  label: string;
  value: number | string;
  accent?: boolean;
  onPress?: () => void;
};

/** Ba ô số trên nền tối. Ô có `onPress` mở thẳng hàng chờ tương ứng. */
export function OpsStats({ items }: { items: OpsStat[] }) {
  return (
    <View style={styles.stats}>
      {items.map((s) => (
        <Pressable
          key={s.label}
          accessibilityRole={s.onPress ? 'button' : 'text'}
          disabled={!s.onPress}
          onPress={s.onPress}
          style={({ pressed }) => [styles.stat, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.statValue, s.accent && { color: C.brandBright }]}>{s.value}</Text>
          <Text style={styles.statLabel} numberOfLines={1}>
            {s.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: S.lg,
    paddingHorizontal: S.lg,
    paddingBottom: S.xl,
    backgroundColor: C.ink,
    borderBottomLeftRadius: R.xl,
    borderBottomRightRadius: R.xl,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  titles: { flex: 1, minWidth: 0, gap: 2 },
  role: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    height: 24,
    marginBottom: S.xs,
    paddingHorizontal: 10,
    borderRadius: R.full,
    backgroundColor: C.brandLt,
  },
  roleText: { fontFamily: F.uiBold, fontSize: 12, color: C.brandDark },
  title: { fontFamily: F.uiBlack, fontSize: 24, lineHeight: 30, color: C.paperWarm },
  sub: { fontFamily: F.ui, fontSize: 13, lineHeight: 18, color: C.lineStrong },
  stats: { flexDirection: 'row', gap: S.sm },
  stat: {
    flex: 1,
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    backgroundColor: C.inkRaised,
  },
  statValue: { fontFamily: F.uiBlack, fontSize: 20, lineHeight: 24, color: C.paperWarm },
  statLabel: { fontFamily: F.uiMedium, fontSize: 12, color: C.lineStrong },
});
