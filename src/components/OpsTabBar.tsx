import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { IconName } from './ui';
import { useMe } from '@/queries/account';
import { useReviewBoard } from '@/queries/ops-review';
import { C, F, R, S } from '@/theme';

/**
 * Thanh điều hướng của bàn vận hành. Thêm tab = file trong `app/ops/(tabs)/` + một dòng `TABS` ở đây + `<Tabs.Screen>`
 * trong layout của nó (như `TabBar` của app người dùng).
 */
const TABS: Record<string, { label: string; icon: IconName }> = {
  home: { label: 'Tổng quan', icon: 'grid' },
  review: { label: 'Duyệt tin', icon: 'check-square' },
  reports: { label: 'Báo cáo', icon: 'flag' },
  people: { label: 'Người dùng', icon: 'users' },
  more: { label: 'Thêm', icon: 'more-horizontal' },
};

/** Hàng nào đếm vào badge của tab nào — theo số hàng của server (`docs/review.md`). */
const TAB_QUEUES: Record<string, number[]> = { review: [0, 3, 4, 5], reports: [1, 2] };

export function OpsTabBar({ state, navigation, insets }: BottomTabBarProps) {
  // Bảng đếm chỉ master đọc được; staff không có badge thay vì một con số sai.
  const isMaster = useMe().data?.isMaster ?? false;
  const board = useReviewBoard(isMaster).data;
  const countOf = (name: string) =>
    (TAB_QUEUES[name] ?? []).reduce(
      (sum, q) => sum + (board?.queues.find((x) => x.queue === q)?.open ?? 0),
      0,
    );

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, S.sm) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? C.brand : C.muted;
        const count = countOf(route.name);
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={count > 0 ? `${tab.label}, ${count} việc` : tab.label}
            onPress={onPress}
            style={styles.item}
          >
            <View>
              <Feather name={tab.icon} size={24} color={color} />
              {count > 0 && (
                <View style={styles.count}>
                  <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color }, focused && styles.labelOn]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: S.sm,
    paddingHorizontal: 6,
    backgroundColor: C.paperWarm,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  item: { width: 70, minHeight: 48, alignItems: 'center', gap: S.xs },
  label: { fontFamily: F.uiMedium, fontSize: 11 },
  labelOn: { fontFamily: F.uiBold },
  count: {
    position: 'absolute',
    top: -6,
    left: 16,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: R.full,
    backgroundColor: C.price,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: F.uiBold, fontSize: 10, color: C.paperWarm },
});
