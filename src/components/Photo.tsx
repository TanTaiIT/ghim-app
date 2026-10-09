import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import type { Picture } from '@/api/client';
import { C } from '@/theme';

/**
 * Ảnh tin đăng, luôn phủ kín khung như `object-fit: cover`. Nhánh `svg` chỉ phục vụ dữ liệu mẫu (tranh
 * minh hoạ của bộ UI) — xoá cùng `@/api/mock-art` khi backend trả URL ảnh thật.
 */
export function Photo({ picture, style }: { picture: Picture; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.frame, style]}>
      {'svg' in picture ? (
        <SvgXml xml={picture.svg} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
      ) : (
        <Image
          source={{ uri: picture.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: C.line },
});
