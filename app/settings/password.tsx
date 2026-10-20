import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Field } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { PinButton, ScreenHeader, useBack } from '@/components/ui';
import { useChangePassword } from '@/queries/settings';
import { C, F, S } from '@/theme';

/** Đổi mật khẩu. Tài khoản chỉ có Google thì server từ chối kèm lời giải thích — câu đó hiện qua toast. */
export default function ChangePassword() {
  const back = useBack();
  const toast = useToast();
  const change = useChangePassword();
  const [form, setForm] = useState({ current: '', next: '', again: '' });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const mismatch = form.again !== '' && form.again !== form.next;
  const canSubmit = form.current !== '' && form.next.length >= 8 && form.again === form.next;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader title="Đổi mật khẩu" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field
            label="Mật khẩu hiện tại"
            value={form.current}
            onChangeText={set('current')}
            secureTextEntry
            autoComplete="current-password"
          />
          <Field
            label="Mật khẩu mới"
            value={form.next}
            onChangeText={set('next')}
            secureTextEntry
            autoComplete="new-password"
            placeholder="Từ 8 ký tự"
          />
          <Field
            label="Nhập lại mật khẩu mới"
            value={form.again}
            onChangeText={set('again')}
            secureTextEntry
            autoComplete="new-password"
            hint={mismatch ? 'Chưa khớp với mật khẩu mới' : undefined}
          />
          <Text style={styles.note}>Đổi xong, các thiết bị khác sẽ bị đăng xuất.</Text>
          <PinButton
            label="Đổi mật khẩu"
            disabled={!canSubmit}
            loading={change.isPending}
            onPress={() =>
              change.mutate(
                { current: form.current, next: form.next },
                {
                  onSuccess: () => {
                    toast('Đã đổi mật khẩu');
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
  note: { fontFamily: F.ui, fontSize: 13, color: C.inkSoft },
});
