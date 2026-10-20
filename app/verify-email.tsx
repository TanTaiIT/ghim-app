import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CodeStep } from '@/components/CodeStep';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, PinButton, ScreenHeader, useBack } from '@/components/ui';
import { useMe } from '@/queries/account';
import { useResendCode, useVerifyEmail } from '@/queries/auth';
import { C, S } from '@/theme';

/**
 * Xác nhận email cho người đã đăng nhập mà chưa nhập mã lúc đăng ký (đóng app giữa chừng, mã quá hạn). Mã cũ có thể
 * vẫn còn trong hộp thư, nên màn không tự gửi mã mới — người dùng bấm "Gửi mã" khi cần.
 */
export default function VerifyEmail() {
  const back = useBack();
  const toast = useToast();
  const me = useMe();
  const verify = useVerifyEmail();
  const resend = useResendCode();
  const [code, setCode] = useState('');
  const [sentAt, setSentAt] = useState<number | null>(null);

  if (me.isPending) return <Loading />;
  if (me.isError || me.data.emailVerified) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Xác nhận email" />
        <EmptyState
          icon={me.isError ? 'wifi-off' : 'check-circle'}
          text={me.isError ? me.error.message : 'Email của bạn đã được xác nhận.'}
        />
      </SafeAreaView>
    );
  }
  const { email } = me.data;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader title="Xác nhận email" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <CodeStep
            email={email}
            code={code}
            onChangeCode={setCode}
            sentAt={sentAt}
            resending={resend.isPending}
            onResend={() =>
              resend.mutate(email, {
                onSuccess: () => setSentAt(Date.now()),
                onError: (e) => toast(e.message),
              })
            }
          />
          <PinButton
            label="Xác nhận"
            disabled={code.length !== 6}
            loading={verify.isPending}
            onPress={() =>
              verify.mutate(
                { email, code },
                {
                  onSuccess: () => {
                    toast('Đã xác nhận email');
                    back();
                  },
                  onError: (e) => toast(e.message),
                },
              )
            }
          />
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
