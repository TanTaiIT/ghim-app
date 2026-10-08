import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuestGate } from '@/components/GuestGate';
import { GhostButton } from '@/components/ui';
import { useSignOut } from '@/queries/auth';
import { useIsAuthenticated, useSessionEmail } from '@/stores/auth';
import { C, F, S } from '@/theme';

export default function Profile() {
  const isAuthenticated = useIsAuthenticated();
  const email = useSessionEmail();
  const signOut = useSignOut();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.title}>Cá nhân</Text>
      {isAuthenticated ? (
        <View style={styles.card}>
          <Text style={styles.label}>Đang đăng nhập</Text>
          <Text style={styles.value}>{email}</Text>
          <GhostButton label="Đăng xuất" onPress={signOut} />
        </View>
      ) : (
        <GuestGate text="Đăng nhập để đăng tin, lưu tin và nhắn với người bán." />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper, padding: S.lg, gap: S.lg },
  title: { fontFamily: F.uiBlack, fontSize: 24, color: C.ink },
  card: { backgroundColor: C.paperWarm, borderRadius: 12, padding: S.lg, gap: S.xs },
  label: { fontFamily: F.uiSemi, fontSize: 12, color: C.inkSoft },
  value: { fontFamily: F.uiBold, fontSize: 16, color: C.ink },
});
