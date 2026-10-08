import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PinButton } from './ui';
import { C, F, S } from '@/theme';

/**
 * Chỗ đứng của khách trong một tab cần đăng nhập. Khách vẫn xem được bảng tin (TK 6), nên không
 * chặn cả tab bằng guard — chỉ phần nội dung cần phiên mới nhường chỗ cho lời mời này.
 */
export function GuestGate({ text }: { text: string }) {
  const router = useRouter();
  return (
    <View style={styles.gate}>
      <Text style={styles.text}>{text}</Text>
      <PinButton label="Đăng nhập" onPress={() => router.push('/login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, justifyContent: 'center', padding: S.xl, gap: S.lg },
  text: { fontFamily: F.ui, fontSize: 15, color: C.inkSoft, textAlign: 'center' },
});
