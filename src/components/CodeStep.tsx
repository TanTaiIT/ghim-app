import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Field } from './Field';
import { GhostButton } from './ui';
import { C, F, S } from '@/theme';

/** Mặc định của server (`identity.resendCooldownSeconds`). Server đổi con số thì 429 của nó vẫn là chốt chặn. */
const RESEND_COOLDOWN_MS = 60_000;

/**
 * Ô nhập mã 6 số gửi qua email, kèm nút gửi lại có đếm ngược — dùng cho xác nhận email và đặt lại mật khẩu. `sentAt`
 * là lúc gửi mã thành công gần nhất (null = chưa gửi lượt nào trên màn này); gửi mã là việc của route.
 */
export function CodeStep({
  email,
  code,
  onChangeCode,
  sentAt,
  onResend,
  resending,
}: {
  email: string;
  code: string;
  onChangeCode: (code: string) => void;
  sentAt: number | null;
  onResend: () => void;
  resending: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (sentAt === null) return undefined;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t - sentAt >= RESEND_COOLDOWN_MS) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [sentAt]);

  // `now` có thể cũ hơn `sentAt` một nhịp ngay sau lượt gửi: kẹp lại để không hiện quá 60 giây.
  const left =
    sentAt === null
      ? 0
      : Math.min(
          RESEND_COOLDOWN_MS / 1000,
          Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - (now - sentAt)) / 1000)),
        );
  const label =
    left > 0 ? `Gửi lại mã sau ${left} giây` : sentAt === null ? 'Gửi mã' : 'Gửi lại mã';

  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>
        Nhập mã 6 số gửi tới <Text style={styles.email}>{email}</Text>. Mã dùng được trong 10 phút;
        không thấy thư thì xem cả mục Spam.
      </Text>
      <Field
        label="Mã xác nhận"
        value={code}
        onChangeText={(t) => onChangeCode(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        placeholder="6 chữ số"
      />
      <GhostButton
        label={resending ? 'Đang gửi…' : label}
        onPress={() => {
          if (left === 0 && !resending) onResend();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.md },
  lead: { fontFamily: F.ui, fontSize: 14, lineHeight: 21, color: C.inkMid },
  email: { fontFamily: F.uiSemi, color: C.ink },
});
