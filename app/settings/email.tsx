import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CodeStep } from '@/components/CodeStep';
import { Field } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { PinButton, ScreenHeader, useBack } from '@/components/ui';
import { useMe } from '@/queries/account';
import { useConfirmEmailChange, useRequestEmailChange } from '@/queries/settings';
import { C, F, S } from '@/theme';

/** Mã xác nhận của server: 6 chữ số. */
const CODE_LENGTH = 6;

/**
 * Đổi email (spec email-change): nhập email mới và mật khẩu hiện tại → mã gửi tới email MỚI → nhập mã. Trước khi xác
 * nhận, email cũ vẫn là email đăng nhập; xác nhận xong các máy khác bị đăng xuất. Mỗi 30 ngày đổi được một lần.
 */
export default function ChangeEmail() {
  const back = useBack();
  const toast = useToast();
  const me = useMe().data;
  const request = useRequestEmailChange();
  const confirm = useConfirmEmailChange();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sentAt, setSentAt] = useState<number | null>(null);

  const send = () =>
    request.mutate(
      { email: email.trim(), password },
      { onSuccess: () => setSentAt(Date.now()), onError: (e) => toast(e.message) },
    );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Đổi email" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {sentAt === null ? (
            <>
              <Text style={styles.note}>
                Email đăng nhập hiện tại: <Text style={styles.strong}>{me?.email ?? '…'}</Text>. Mã
                xác nhận gửi tới email mới; email cũ vẫn dùng để đăng nhập tới khi bạn nhập mã. Mỗi
                30 ngày đổi được một lần.
              </Text>
              <Field
                label="Email mới"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="ten@email.com"
              />
              <Field
                label="Mật khẩu hiện tại"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              <PinButton
                label="Gửi mã tới email mới"
                disabled={!email.includes('@') || password.length === 0}
                loading={request.isPending}
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
                onResend={send}
                resending={request.isPending}
              />
              <PinButton
                label="Xác nhận email mới"
                disabled={code.length !== CODE_LENGTH}
                loading={confirm.isPending}
                onPress={() =>
                  confirm.mutate(code, {
                    onSuccess: () => {
                      toast('Đã đổi email — các thiết bị khác đã được đăng xuất');
                      back();
                    },
                    onError: (e) => toast(e.message),
                  })
                }
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.md },
  note: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  strong: { fontFamily: F.uiSemi, color: C.ink },
});
