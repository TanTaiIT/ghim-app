import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CodeStep } from '@/components/CodeStep';
import { Field } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { GhostButton, PinButton, ScreenHeader } from '@/components/ui';
import { useLogin, useRegister, useResendCode, useVerifyEmail } from '@/queries/auth';
import { C, S } from '@/theme';

/**
 * Đăng ký hai bước trên cùng một màn: điền thông tin → nhập mã gửi qua email → tự đăng nhập. Mật khẩu chỉ nằm trong
 * state của màn này (không qua tham số route hay store) để bước cuối đăng nhập hộ. Đăng nhập xong thì `Stack.Protected`
 * gỡ màn này (HARD#18) — không tự điều hướng.
 */
export default function Register() {
  const router = useRouter();
  const toast = useToast();
  const register = useRegister();
  const verify = useVerifyEmail();
  const resend = useResendCode();
  const login = useLogin();
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [code, setCode] = useState('');
  /** null = đang ở bước điền thông tin; có giá trị = mã đã gửi lúc đó. */
  const [sentAt, setSentAt] = useState<number | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canRegister =
    form.displayName.trim().length >= 2 && form.email.includes('@') && form.password.length >= 8;

  const confirm = () =>
    verify.mutate(
      { email: form.email, code },
      {
        onSuccess: () =>
          login.mutate(
            { email: form.email, password: form.password },
            {
              onSuccess: () => toast('Đã xác nhận email, chào mừng bạn đến Ghim'),
              onError: (e) => {
                toast(e.message);
                router.replace('/login');
              },
            },
          ),
        onError: (e) => toast(e.message),
      },
    );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader title={sentAt === null ? 'Đăng ký' : 'Xác nhận email'} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {sentAt === null ? (
            <>
              <Field
                label="Tên hiển thị"
                value={form.displayName}
                onChangeText={set('displayName')}
                autoComplete="name"
                placeholder="2–40 ký tự, người mua thấy tên này"
                maxLength={40}
              />
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
                autoComplete="new-password"
                placeholder="Từ 8 ký tự"
              />
              <PinButton
                label="Đăng ký"
                disabled={!canRegister}
                loading={register.isPending}
                onPress={() =>
                  register.mutate(form, {
                    onSuccess: () => setSentAt(Date.now()),
                    onError: (e) => toast(e.message),
                  })
                }
              />
              <GhostButton
                label="Đã có tài khoản? Đăng nhập"
                onPress={() => router.replace('/login')}
              />
            </>
          ) : (
            <>
              <CodeStep
                email={form.email.trim()}
                code={code}
                onChangeCode={setCode}
                sentAt={sentAt}
                resending={resend.isPending}
                onResend={() =>
                  resend.mutate(form.email, {
                    onSuccess: () => setSentAt(Date.now()),
                    onError: (e) => toast(e.message),
                  })
                }
              />
              <PinButton
                label="Xác nhận"
                disabled={code.length !== 6}
                loading={verify.isPending || login.isPending}
                onPress={confirm}
              />
            </>
          )}
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
