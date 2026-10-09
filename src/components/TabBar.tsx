import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useGuardedPush } from './GuestGate';
import type { IconName } from './ui';
import { useHasUnreadNotices } from '@/queries/account';
import { useUnreadTotal } from '@/queries/messages';
import { C, F, R, S, shadowBrand } from '@/theme';

/**
 * Thanh điều hướng tự vẽ theo thiết kế: nút Đăng tin nổi lên giữa thanh và badge đếm tin nhắn — tab bar
 * mặc định của expo-router không có ô nào không phải tab. Thêm tab = file trong `app/(tabs)/` + một dòng
 * `TABS` ở đây + `<Tabs.Screen>` trong layout.
 */
const TABS: Record<string, { label: string; icon: IconName }> = {
  home: { label: 'Khám phá', icon: 'compass' },
  inbox: { label: 'Tin nhắn', icon: 'message-circle' },
  notifications: { label: 'Thông báo', icon: 'bell' },
  profile: { label: 'Cá nhân', icon: 'user' },
};

/** Nút Đăng tin chen vào sau tab thứ hai — giữa thanh bốn tab. */
const POST_AFTER = 1;

export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const unread = useUnreadTotal();
  const hasNotice = useHasUnreadNotices();
  const push = useGuardedPush();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, S.sm) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? C.brand : C.muted;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Fragment key={route.key}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              onPress={onPress}
              style={styles.item}
            >
              <View>
                <Feather name={tab.icon} size={24} color={color} />
                {route.name === 'inbox' && unread > 0 && (
                  <View style={styles.count}>
                    <Text style={styles.countText}>{unread > 99 ? '99+' : unread}</Text>
                  </View>
                )}
                {route.name === 'notifications' && hasNotice && <View style={styles.dot} />}
              </View>
              <Text style={[styles.label, { color }, focused && styles.labelOn]}>{tab.label}</Text>
            </Pressable>
            {index === POST_AFTER && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đăng tin"
                onPress={() => push('/post')}
                style={styles.item}
              >
                <View style={styles.fab}>
                  <Feather name="plus" size={26} color={C.paperWarm} />
                </View>
                <Text style={[styles.label, styles.labelOn, { color: C.brand }]}>Đăng tin</Text>
              </Pressable>
            )}
          </Fragment>
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
  item: { width: 64, minHeight: 48, alignItems: 'center', gap: S.xs },
  label: { fontFamily: F.uiMedium, fontSize: 11 },
  labelOn: { fontFamily: F.uiBold },
  fab: {
    marginTop: -26,
    width: 56,
    height: 56,
    borderRadius: R.lg,
    borderWidth: 4,
    borderColor: C.paperWarm,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowBrand,
  },
  count: {
    position: 'absolute',
    top: -6,
    left: 14,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: R.full,
    backgroundColor: C.price,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: F.uiBold, fontSize: 10, color: C.paperWarm },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: R.full,
    borderWidth: 2,
    borderColor: C.paperWarm,
    backgroundColor: C.dot,
  },
});
