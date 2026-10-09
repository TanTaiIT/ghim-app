import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { EmptyState, PinButton, type IconName } from './ui';
import { useIsAuthenticated } from '@/stores/auth';
import { S } from '@/theme';

/**
 * Chỗ đứng của khách trong một tab cần đăng nhập. Khách vẫn xem được bảng tin (TK 6), nên không
 * chặn cả tab bằng guard — chỉ phần nội dung cần phiên mới nhường chỗ cho lời mời này.
 */
export function GuestGate({ text, icon = 'user' }: { text: string; icon?: IconName }) {
  const router = useRouter();
  return (
    <View style={styles.gate}>
      <EmptyState icon={icon} text={text} />
      <PinButton label="Đăng nhập" onPress={() => router.push('/login')} />
    </View>
  );
}

/**
 * Điều hướng tới màn cần phiên. Khách bấm "Chat ngay" hay nút Đăng tin thì mở màn đăng nhập: đẩy thẳng
 * vào route nằm trong `Stack.Protected` khi guard đang tắt thì expo-router không mở gì cả, nút như chết.
 */
export function useGuardedPush() {
  const router = useRouter();
  const authed = useIsAuthenticated();
  return (href: Href) => router.push(authed ? href : '/login');
}

/** Như `useGuardedPush` nhưng cho hành động (mutation) thay vì điều hướng. */
export function useGuarded() {
  const router = useRouter();
  const authed = useIsAuthenticated();
  return (action: () => void) => (authed ? action() : router.push('/login'));
}

const styles = StyleSheet.create({
  gate: { flex: 1, justifyContent: 'center', padding: S.xl, gap: S.lg },
});
