import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { Picture } from '@/api/client';
import { C } from '@/theme';

/** Ảnh phủ kín khung như `object-fit: cover`; `contain` cho màn xem lớn, nơi cắt ảnh là mất chi tiết. */
export function Photo({
  picture,
  style,
  fit = 'cover',
}: {
  picture: Picture;
  style?: StyleProp<ViewStyle>;
  fit?: 'cover' | 'contain';
}) {
  return (
    <View style={[styles.frame, fit === 'contain' && styles.bare, style]}>
      <Image
        source={{ uri: picture.uri }}
        style={StyleSheet.absoluteFill}
        contentFit={fit}
        transition={150}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: C.line },
  bare: { backgroundColor: 'transparent' },
});
