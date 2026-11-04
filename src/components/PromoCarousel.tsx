import { useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { PageDots } from './PageDots';
import { C, F, R, S } from '@/theme';

export type Promo = {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  text: string;
  cta: string;
  tone: 'brand' | 'boost';
  onPress: () => void;
};

const TONES = {
  brand: { bg: C.brandWash, line: C.brandLine, iconBg: C.brandLt, fg: C.brandDark, cta: C.brand },
  boost: { bg: C.warnWash, line: C.warnLine, iconBg: C.boost, fg: C.boostTx, cta: C.price },
} as const;

/**
 * Banner trượt ngang của trang chủ (ảnh mẫu 02/11/2026). Mỗi trang rộng đúng khối nội dung — màn hình trừ lề `bleed`
 * hai bên — để `pagingEnabled` dừng đúng mép banner thay vì giữa hai banner.
 */
export function PromoCarousel({ items, bleed = S.lg }: { items: Promo[]; bleed?: number }) {
  const { width } = useWindowDimensions();
  const page = width - bleed * 2;
  const [index, setIndex] = useState(0);
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / page));

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={settle}
        style={{ width: page }}
      >
        {items.map((p) => {
          const tone = TONES[p.tone];
          return (
            <View
              key={p.key}
              style={[
                styles.banner,
                { width: page, backgroundColor: tone.bg, borderColor: tone.line },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: tone.iconBg }]}>
                <Feather name={p.icon} size={26} color={tone.fg} />
              </View>
              <View style={styles.body}>
                <Text style={[styles.title, { color: tone.fg }]}>{p.title}</Text>
                <Text style={styles.text} numberOfLines={2}>
                  {p.text}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={p.onPress}
                style={[styles.cta, { backgroundColor: tone.cta }]}
              >
                <Text style={styles.ctaText}>{p.cta}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      <PageDots ids={items.map((p) => p.key)} index={index} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 1,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: S.xs },
  title: { fontFamily: F.uiBlack, fontSize: 17 },
  text: { fontFamily: F.ui, fontSize: 13, color: C.inkSoft },
  cta: { height: 44, paddingHorizontal: S.lg, borderRadius: R.sm, justifyContent: 'center' },
  ctaText: { fontFamily: F.uiBold, fontSize: 14, color: C.paperWarm },
});
