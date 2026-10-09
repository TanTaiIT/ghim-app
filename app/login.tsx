import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { PinButton, ScreenHeader } from '@/components/ui';
import { useLogin } from '@/queries/auth';
import { C, F, S } from '@/theme';

/**
 * Màn đăng nhập. Gọi `useLogin` (đang chạy trên dữ liệu mẫu — xem `src/queries/auth.ts`) và KHÔNG tự
 * `router.replace` sau khi `signIn`: `Stack.Protected` gỡ màn này khỏi stack (HARD#18).
 */
export default function Login() {
  const toast = useToast();
  const login = useLogin();
  const [form, setForm] = useState({ email: '', password: '' });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.email.includes('@') && form.password.length >= 8;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader title="Đăng nhập" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          <PinButton
            label="Đăng nhập"
            disabled={!canSubmit}
            loading={login.isPending}
            onPress={() => login.mutate(form, { onError: (e) => toast(e.message) })}
          />
          <Text style={styles.note}>
            Đang chạy trên dữ liệu mẫu: email bất kỳ, mật khẩu từ 8 ký tự là vào được.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paperWarm },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.lg },
  note: { fontFamily: F.ui, fontSize: 12, color: C.muted, textAlign: 'center' },
});
