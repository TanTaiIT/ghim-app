import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '@/components/Field';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { PinButton, ScreenHeader, useBack } from '@/components/ui';
import { useRequestAccountDeletion } from '@/queries/auth';
import { C, F, S } from '@/theme';

/**
 * Xoá tài khoản không cần đăng nhập (kênh hỗ trợ): cho người không vào được app nữa mà vẫn nhớ mật khẩu. Đã đăng nhập
 * thì xoá trong Cài đặt. Đang bị khoá hay đang là chủ nhóm thì server từ chối và nói lý do.
 */
export default function DeleteAccount() {
  const back = useBack();
  const toast = useToast();
  const remove = useRequestAccountDeletion();
  const [form, setForm] = useState({ email: '', password: '' });
  const [confirming, setConfirming] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.email.includes('@') && form.password.length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader title="Xoá tài khoản" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            Xoá xong, hồ sơ và tin đăng của bạn không còn hiện với ai, mọi thiết bị bị đăng xuất.
            Chủ nhóm cần chuyển quyền chủ trước khi xoá.
          </Text>
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
          />
          <PinButton
            label="Xoá tài khoản"
            disabled={!canSubmit}
            loading={remove.isPending}
            onPress={() => setConfirming(true)}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmSheet
        visible={confirming}
        title="Xoá hẳn tài khoản này?"
        confirmLabel="Xoá tài khoản"
        note="Không hoàn tác được trong app"
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          remove.mutate(form, {
            onSuccess: () => {
              toast('Đã xoá tài khoản');
              back();
            },
            onError: (e) => toast(e.message),
          })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paperWarm },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.lg },
  lead: { fontFamily: F.ui, fontSize: 14, lineHeight: 21, color: C.inkMid },
});
