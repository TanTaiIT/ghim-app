import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '@/components/Field';
import { ApiError } from '@/api/http';
import { useToast } from '@/components/Toast';
import { GhostButton, PinButton, ScreenHeader } from '@/components/ui';
import { useLogin } from '@/queries/auth';
import { C, S } from '@/theme';

/**
 * Màn đăng nhập. KHÔNG tự `router.replace` sau khi `signIn`: `Stack.Protected` gỡ màn này khỏi stack
 * (HARD#18).
 */
export default function Login() {
  const router = useRouter();
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
            onPress={() =>
              login.mutate(form, {
                // Tài khoản bị khoá: câu của server (kèm lý do) hiện ở màn khiếu nại thay cho toast.
                onError: (e) =>
                  e instanceof ApiError && e.code === 'ACCOUNT_LOCKED'
                    ? router.push({
                        pathname: '/lock-appeal',
                        params: { email: form.email.trim(), reason: e.message },
                      })
                    : toast(e.message),
              })
            }
          />
          <GhostButton label="Quên mật khẩu?" onPress={() => router.push('/forgot-password')} />
          {/* Thay chứ không chồng: qua lại giữa đăng nhập và đăng ký không xếp thêm màn nào. */}
          <GhostButton
            label="Chưa có tài khoản? Đăng ký"
            onPress={() => router.replace('/register')}
          />
          <GhostButton label="Xoá tài khoản" onPress={() => router.push('/delete-account')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paperWarm },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.lg },
});
