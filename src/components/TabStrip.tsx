import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F, R, S } from '@/theme';

type TabItem<T extends string> = { id: T; label: string };

/** Tab gạch chân (trang nhóm, thông báo). */
export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.underline}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <Pressable
            key={t.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(t.id)}
            style={[styles.uTab, on && styles.uTabOn]}
          >
            <Text style={[styles.uLabel, on && styles.uLabelOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tab dạng viên trên nền xám (trang Cá nhân). */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.segment}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <Pressable
            key={t.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(t.id)}
            style={[styles.sTab, on && styles.sTabOn]}
          >
            <Text style={[styles.sLabel, on && styles.sLabelOn]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  underline: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line },
  uTab: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  uTabOn: { borderBottomColor: C.brand },
  uLabel: { fontFamily: F.uiMedium, fontSize: 14, color: C.inkSoft },
  uLabelOn: { fontFamily: F.uiBold, color: C.brand },
  segment: {
    flexDirection: 'row',
    gap: S.xs,
    padding: S.xs,
    borderRadius: R.md,
    backgroundColor: C.line,
  },
  sTab: {
    flex: 1,
    height: 40,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sTabOn: { backgroundColor: C.paperWarm },
  sLabel: { fontFamily: F.uiMedium, fontSize: 13, color: C.ink },
  sLabelOn: { fontFamily: F.uiBold },
});
