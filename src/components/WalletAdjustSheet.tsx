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
import { newIdempotencyKey } from '@/api/ops-admin';
import { BarButton } from './ActionBar';
import { Choice } from './Chip';
import { Field } from './Field';
import { C, F, R, S } from '@/theme';

/** Trần một lượt của server (`WALLET_ADJUST_LIMIT`) — chống gõ nhầm, không phải luật nghiệp vụ. */
const LIMIT = 1000;

/**
 * Hộp cấp / trừ Xu của master (ghim-server add-wallet): chiều, số Xu, lý do người dùng đọc được. Khoá chống lặp sinh
 * lúc mở hộp, không lúc bấm — bấm lại khi mạng chậm gửi cùng khoá, server trả cùng dòng. Nội dung unmount khi đóng
 * nên lần mở sau là khoá mới.
 */
export function WalletAdjustSheet({
  visible,
  name,
  balance,
  busy,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  name: string;
  balance: number;
  busy: boolean;
  onSubmit: (input: { amount: number; reason: string; idempotencyKey: string }) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
          <View style={styles.grip} />
          <Text style={styles.title}>Cấp / trừ Xu — {name}</Text>
          <Text style={styles.text}>
            Số dư hiện tại {balance} Xu. Xu không mua bằng tiền; cấp sai thì trừ lại.
          </Text>
          {visible && (
            <SheetForm balance={balance} busy={busy} onSubmit={onSubmit} onClose={onClose} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SheetForm({
  balance,
  busy,
  onSubmit,
  onClose,
}: {
  balance: number;
  busy: boolean;
  onSubmit: (input: { amount: number; reason: string; idempotencyKey: string }) => void;
  onClose: () => void;
}) {
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [direction, setDirection] = useState<'grant' | 'deduct'>('grant');
  const [amountText, setAmountText] = useState('');
  const [reason, setReason] = useState('');
  const amount = Number.parseInt(amountText, 10);
  const valid = Number.isInteger(amount) && amount >= 1 && amount <= LIMIT;
  const overdraft = direction === 'deduct' && valid && amount > balance;
  const ready = valid && !overdraft && reason.trim().length > 0;
  return (
    <>
      <View style={styles.choices}>
        <Choice
          label="Cấp Xu"
          selected={direction === 'grant'}
          onPress={() => setDirection('grant')}
        />
        <Choice
          label="Trừ Xu"
          selected={direction === 'deduct'}
          onPress={() => setDirection('deduct')}
        />
      </View>
      <Field
        label="Số Xu"
        value={amountText}
        onChangeText={(t) => setAmountText(t.replace(/[^0-9]/g, ''))}
        placeholder="5"
        keyboardType="number-pad"
        autoFocus
        hint={overdraft ? `Ví chỉ có ${balance} Xu` : `Tối đa ${LIMIT} Xu một lượt`}
      />
      <Field
        label="Lý do"
        value={reason}
        onChangeText={setReason}
        placeholder="Xin qua Hỗ trợ Ghim"
        maxLength={200}
        hint="Người dùng đọc được lý do này trong lịch sử ví."
      />
      <View style={styles.row}>
        <BarButton label="Huỷ" tone="ghost" onPress={onClose} />
        <BarButton
          label={direction === 'grant' ? 'Cấp' : 'Trừ'}
          tone={direction === 'grant' ? 'primary' : 'danger'}
          loading={busy}
          disabled={!ready}
          onPress={() =>
            onSubmit({
              amount: direction === 'grant' ? amount : -amount,
              reason: reason.trim(),
              idempotencyKey,
            })
          }
        />
      </View>
    </>
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
  choices: { flexDirection: 'row', gap: S.sm },
  row: { flexDirection: 'row', gap: 10 },
});
