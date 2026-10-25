import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { Picture } from '@/api/client';
import { C } from '@/theme';

/** Ảnh tin đăng, luôn phủ kín khung như `object-fit: cover`. */
export function Photo({ picture, style }: { picture: Picture; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.frame, style]}>
      <Image
        source={{ uri: picture.uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={150}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: C.line },
});
