import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field } from './Field';
import { PinButton } from './ui';
import { C, F, R, S } from '@/theme';

/** Trần của server (`lookupCodeBodySchema`); mã hiện là 6 ký tự nhưng độ dài là con số master chỉnh được. */
const CODE_MAX = 20;

/** Ô nhập mã của nhóm riêng tư · có mã. Đúng mã thì thành đơn chờ duyệt, không vào thẳng (spec membership). */
export function GroupCodeSheet({
  visible,
  busy,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  busy: boolean;
  onSubmit: (code: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const trimmed = code.trim();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
          <View style={styles.grip} />
          <Text style={styles.title}>Nhập mã nhóm</Text>
          <Text style={styles.text}>
            Mã do quản trị nhóm đưa. Gửi đơn xong, quản trị nhóm duyệt thì bạn vào nhóm.
          </Text>
          <Field
            label="Mã nhóm"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={CODE_MAX}
          />
          <PinButton
            label="Gửi đơn xin vào"
            loading={busy}
            disabled={trimmed === ''}
            onPress={() => onSubmit(trimmed)}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.scrim },
  sheet: {
    backgroundColor: C.paperWarm,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S.sm,
    paddingHorizontal: S.lg,
    gap: S.md,
  },
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.lineStrong,
  },
  title: { fontFamily: F.uiBold, fontSize: 17, color: C.ink, paddingTop: S.sm },
  text: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
});
