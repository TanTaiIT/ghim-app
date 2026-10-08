import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field, PinButton, ScreenHeader } from '@/components/ui';
import { C, F, S } from '@/theme';

/**
 * Màn đăng nhập. Chưa có mutation: backend chưa có capability `identity/sessions` (change
 * `add-identity` của ghim-server). Khi có, thêm `useLogin` ở `src/queries/auth.ts`, gọi
 * `login.mutate(form, { onError: (e) => toast(e.message) })` ở đây và KHÔNG tự `router.replace`
 * sau khi `signIn` — `Stack.Protected` đổi stack (HARD#18).
 */
export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.email.includes('@') && form.password.length >= 8;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader title="Đăng nhập" />
          <Field
            label="Email"
            value={form.email}
            onChangeText={set('email')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="ban@vi-du.vn"
          />
          <Field
            label="Mật khẩu"
            value={form.password}
            onChangeText={set('password')}
            secureTextEntry
            autoComplete="password"
            placeholder="Từ 8 ký tự"
          />
          <PinButton label="Đăng nhập" onPress={() => {}} disabled={!canSubmit} />
          <Text style={styles.note}>
            Backend chưa mở API đăng nhập. Màn này sẽ nối vào khi ghim-server phát hành module tài
            khoản.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.lg },
  note: { fontFamily: F.ui, fontSize: 12, color: C.muted, textAlign: 'center' },
});
