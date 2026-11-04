import { StyleSheet, View } from 'react-native';
import { C, R } from '@/theme';

/** Chấm chỉ trang dưới một dải trượt từng trang (banner, Tin nổi bật); một trang thì không vẽ. */
export function PageDots({ ids, index }: { ids: string[]; index: number }) {
  if (ids.length < 2) return null;
  return (
    <View style={styles.dots}>
      {ids.map((id, i) => (
        <View key={id} style={[styles.dot, i === index && styles.dotOn]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: R.full, backgroundColor: C.lineStrong },
  dotOn: { width: 18, backgroundColor: C.brand },
});
