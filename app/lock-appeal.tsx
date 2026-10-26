import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LockAppealResult } from '@/api/client';
import { CodeStep } from '@/components/CodeStep';
import { Field } from '@/components/Field';
import { APPEAL_LABEL } from '@/components/StrikeCard';
import { useToast } from '@/components/Toast';
import { PinButton, ScreenHeader } from '@/components/ui';
import { useFileLockAppeal, useRequestLockAppealCode } from '@/queries/auth';
import { C, F, R, S } from '@/theme';
import { formatDate } from '@/utils/format';

/** Đủ để người xét hiểu chuyện — cùng mức với khiếu nại cảnh cáo thường. */
const STATEMENT_MIN = 10;
/** Trần của server (`STATEMENT_MAX`, ghim-server strike.schema). */
const STATEMENT_MAX = 2000;

/**
 * Khiếu nại khoá tài khoản vì vi phạm nghiêm trọng, không cần đăng nhập: chứng minh sở hữu email bằng mã rồi nộp lời
 * trình bày. Mở từ màn đăng nhập khi server trả `ACCOUNT_LOCKED` (`email`, `reason` đi theo) và từ "Cảnh cáo của tôi".
 * Server không nói email nào đang bị khoá — khoá vì lý do khác thì bước nộp báo mã sai.
 */
export default function LockAppeal() {
  const params = useLocalSearchParams<{ email?: string; reason?: string }>();
  const toast = useToast();
  const requestCode = useRequestLockAppealCode();
  const file = useFileLockAppeal();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [statement, setStatement] = useState('');
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [result, setResult] = useState<LockAppealResult | null>(null);

  const send = () =>
    requestCode.mutate(email, {
      onSuccess: () => setSentAt(Date.now()),
      onError: (e) => toast(e.message),
    });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader title="Khiếu nại khoá tài khoản" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {params.reason && <Text style={styles.reason}>{params.reason}</Text>}
          {result ? (
            <View style={styles.result}>
              <Text style={styles.resultTitle}>Ghim đã nhận khiếu nại của bạn</Text>
              <Text style={styles.lead}>{result.rule}</Text>
              <Text style={styles.meta}>
                Khoá ngày {formatDate(result.issuedAt)} · hạn khiếu nại{' '}
                {formatDate(result.appealUntil)}
              </Text>
              <Text style={styles.meta}>{APPEAL_LABEL[result.status]}</Text>
            </View>
          ) : sentAt === null ? (
            <>
              <Text style={styles.lead}>
                Tài khoản bị khoá vì vi phạm nghiêm trọng được khiếu nại một lần, trong thời hạn
                tính từ lúc bị khoá. Ghim gửi mã tới email đăng ký để chắc đó là bạn.
              </Text>
              <Field
                label="Email đăng ký"
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
                loading={requestCode.isPending}
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
                resending={requestCode.isPending}
                onResend={send}
              />
              <Field
                label="Vì sao việc khoá chưa đúng"
                value={statement}
                onChangeText={setStatement}
                multiline
                maxLength={STATEMENT_MAX}
                placeholder="Kể rõ để người xét hiểu chuyện"
              />
              <PinButton
                label="Gửi khiếu nại"
                disabled={code.length !== 6 || statement.trim().length < STATEMENT_MIN}
                loading={file.isPending}
                onPress={() =>
                  file.mutate(
                    { email, code, statement },
                    { onSuccess: setResult, onError: (e) => toast(e.message) },
                  )
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
  screen: { flex: 1, backgroundColor: C.paperWarm },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.lg },
  reason: {
    padding: S.md,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.warnLine,
    backgroundColor: C.warnWash,
    fontFamily: F.uiSemi,
    fontSize: 14,
    lineHeight: 20,
    color: C.warnTx,
  },
  lead: { fontFamily: F.ui, fontSize: 14, lineHeight: 21, color: C.inkMid },
  meta: { fontFamily: F.ui, fontSize: 13, color: C.inkSoft },
  result: {
    gap: S.sm,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
  },
  resultTitle: { fontFamily: F.uiBold, fontSize: 16, color: C.ink },
});
