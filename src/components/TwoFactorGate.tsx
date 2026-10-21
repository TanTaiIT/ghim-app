import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field } from './Field';
import { OpsHeader } from './OpsHeader';
import { OutlineButton, PinButton } from './ui';
import { C, F, R, S } from '@/theme';

/**
 * Bàn vận hành đóng cho tới khi phiên có lớp thứ hai (server: `TWO_FACTOR_REQUIRED`, kể cả master). Staff đã bật lớp
 * thứ hai thì đăng nhập lại kèm mã; người chưa bật thiết lập ở đây — mã đầu tiên đúng mở bàn cho chính phiên này.
 * Thiết lập lại khi đã bật là việc của đội kỹ thuật (`cli:reset-2fa`), server trả `TWO_FACTOR_ENABLED`.
 */
export function TwoFactorGate({
  setup,
  starting,
  confirming,
  onStart,
  onConfirm,
}: {
  setup: { uri: string; secret: string } | null;
  starting: boolean;
  confirming: boolean;
  onStart: () => void;
  onConfirm: (code: string) => void;
}) {
  const [code, setCode] = useState('');
  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title="Lớp bảo vệ thứ hai"
        sub="Bắt buộc với master và staff trước khi vào bàn vận hành"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!setup ? (
          <>
            <Text style={styles.text}>
              Dùng một ứng dụng tạo mã (Google Authenticator, Microsoft Authenticator, 1Password…).
              Đã bật lớp thứ hai trước đây thì đăng xuất rồi chọn “Đăng nhập quản trị” và nhập mã
              khi đăng nhập.
            </Text>
            <PinButton label="Bắt đầu thiết lập" loading={starting} onPress={onStart} />
          </>
        ) : (
          <>
            <Text style={styles.step}>1. Thêm tài khoản vào ứng dụng tạo mã</Text>
            <OutlineButton
              label="Mở ứng dụng tạo mã"
              onPress={() => void Linking.openURL(setup.uri)}
            />
            <Text style={styles.text}>Không mở được thì nhập tay khoá này vào ứng dụng:</Text>
            <Text selectable style={styles.secret}>
              {setup.secret.replace(/(.{4})/g, '$1 ').trim()}
            </Text>
            <Text style={styles.step}>2. Nhập mã 6 số ứng dụng đang hiện</Text>
            <Field
              label="Mã xác nhận"
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              placeholder="6 chữ số"
            />
            <PinButton
              label="Xác nhận và vào bàn vận hành"
              disabled={code.length !== 6}
              loading={confirming}
              onPress={() => onConfirm(code)}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.lg },
  text: { fontFamily: F.ui, fontSize: 14, lineHeight: 21, color: C.inkMid },
  step: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  secret: {
    padding: S.md,
    borderRadius: R.md,
    backgroundColor: C.sand,
    fontFamily: F.uiBold,
    fontSize: 16,
    letterSpacing: 1,
    color: C.ink,
    textAlign: 'center',
  },
});
