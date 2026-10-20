import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { C, F, TONE, type Tone } from '@/theme';

/* Dấu hiệu danh tính: ảnh đại diện (hay ô chữ cái khi chưa có ảnh), tích xanh đã xác minh. */

const AVATAR_TONES: Tone[] = ['blue', 'rose', 'gold', 'violet', 'mint', 'red'];

/** Tông theo băm của tên: cùng một người luôn cùng màu, mà backend không phải lưu màu. */
function toneOf(seed: string): Tone {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length] ?? 'slate';
}

export function Avatar({
  name,
  size = 18,
  tone,
  uri,
}: {
  name: string;
  size?: number;
  tone?: Tone;
  uri?: string | null;
}) {
  const t = TONE[tone ?? toneOf(name)];
  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={name}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.sand }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg },
      ]}
    >
      <Text style={[styles.text, { color: t.fg, fontSize: Math.round(size * 0.42) }]}>
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export function Verified({ size = 15 }: { size?: number }) {
  return (
    <Ionicons
      name="checkmark-circle"
      size={size}
      color={C.brandBright}
      accessibilityLabel="Đã xác minh"
    />
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: F.uiBold },
});
