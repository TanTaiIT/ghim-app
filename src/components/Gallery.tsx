import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Picture } from '@/api/client';
import { Photo } from './Photo';
import { C, F, R, S } from '@/theme';

/** Ảnh tin đăng lướt ngang từng tấm, chấm vị trí ở giữa và bộ đếm "1 / 6" góc phải. */
export function Gallery({ photos, height }: { photos: Picture[]; height: number }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  return (
    <View style={{ height }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {photos.map((p, i) => (
          // Ảnh không có id riêng và thứ tự cố định trong một tin — index là danh tính.
          // oxlint-disable-next-line react/no-array-index-key
          <Photo key={i} picture={p} style={{ width, height }} />
        ))}
      </ScrollView>
      {photos.length > 1 && (
        <>
          <View style={styles.dots} pointerEvents="none">
            {photos.map((_, i) => (
              // oxlint-disable-next-line react/no-array-index-key
              <View key={i} style={[styles.dot, i === index && styles.dotOn]} />
            ))}
          </View>
          <View style={styles.counter} pointerEvents="none">
            <Text style={styles.counterText}>
              {index + 1} / {photos.length}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Chấm và bộ đếm nằm trên phần ảnh bị thẻ nội dung đè 20px, nên đẩy lên thêm cho khỏi bị che.
  dots: {
    position: 'absolute',
    bottom: S.xl + 6,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: R.full, backgroundColor: C.paperWarm, opacity: 0.75 },
  dotOn: { width: 18, backgroundColor: C.brand, opacity: 1 },
  counter: {
    position: 'absolute',
    bottom: S.xl + 2,
    right: S.lg,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: R.full,
    backgroundColor: C.scrim,
    justifyContent: 'center',
  },
  counterText: { fontFamily: F.uiSemi, fontSize: 12, color: C.paperWarm },
});
