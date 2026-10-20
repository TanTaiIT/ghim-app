import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CodeStep } from '@/components/CodeStep';
import { Field } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { PinButton, ScreenHeader } from '@/components/ui';
import { useForgotPassword, useLogin, useResetPassword } from '@/queries/auth';
import { C, F, S } from '@/theme';

/**
 * Quên mật khẩu: email → mã + mật khẩu mới → tự đăng nhập. Server trả lời giống nhau dù email có tài khoản hay
 * không, nên màn luôn sang bước nhập mã; email không có tài khoản thì mã nào cũng sai.
 */
export default function ForgotPassword() {
  const router = useRouter();
  const toast = useToast();
  const forgot = useForgotPassword();
  const reset = useResetPassword();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sentAt, setSentAt] = useState<number | null>(null);

  const send = () =>
    forgot.mutate(email, {
      onSuccess: () => setSentAt(Date.now()),
      onError: (e) => toast(e.message),
    });

  const confirm = () =>
    reset.mutate(
      { email, code, password },
      {
        onSuccess: () =>
          login.mutate(
            { email, password },
            {
              onSuccess: () => toast('Đã đặt lại mật khẩu'),
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
        <ScreenHeader title="Quên mật khẩu" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {sentAt === null ? (
            <>
              <Text style={styles.lead}>
                Nhập email đăng ký, Ghim gửi mã để bạn đặt mật khẩu mới.
              </Text>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="ban@vi-du.vn"
              />
              <PinButton
                label="Gửi mã"
                disabled={!email.includes('@')}
                loading={forgot.isPending}
                onPress={send}
              />
            </>
          ) : (
            <>
              <CodeStep
                email={email.trim()}
                code={code}
                onChangeCode={setCode}
                sentAt={sentAt}
                resending={forgot.isPending}
                onResend={send}
              />
              <Field
                label="Mật khẩu mới"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                placeholder="Từ 8 ký tự"
              />
              <Text style={styles.lead}>
                Đặt lại xong, mọi thiết bị đang đăng nhập sẽ bị đăng xuất.
              </Text>
              <PinButton
                label="Đặt lại mật khẩu"
                disabled={code.length !== 6 || password.length < 8}
                loading={reset.isPending || login.isPending}
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
  lead: { fontFamily: F.ui, fontSize: 14, lineHeight: 21, color: C.inkMid },
});
