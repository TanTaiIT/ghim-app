import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { Choice } from '@/components/Chip';
import { Field } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { EmptyState, PinButton, SafetyNote, ScreenHeader } from '@/components/ui';
import { useSubmitIdVerification } from '@/queries/account';
import { ID_DOCUMENT_TYPES, idNumberIssue, type IdDocumentType } from '@/api/client';
import { C, F, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/**
 * Nộp giấy tờ xác minh (spec id-verification): tự nguyện, không chặn gì và không đổi việc đăng tin, mức tin cậy hay máy
 * duyệt. Số giấy tờ chỉ người duyệt thấy, không bao giờ hiện ra ngoài. Server chưa có route xem lại hồ sơ đã nộp, nên màn
 * này chỉ biết kết quả lượt nộp vừa rồi; đang có hồ sơ chờ thì lượt nộp nhận câu báo của server.
 */
export default function VerifyId() {
  const toast = useToast();
  const submit = useSubmitIdVerification();
  const [type, setType] = useState<IdDocumentType>('CCCD');
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const issue = number.trim() ? idNumberIssue(type, number) : null;
  const done = submit.data;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Xác minh tài khoản" />
      {done ? (
        <EmptyState
          icon="clock"
          title="Đã gửi hồ sơ"
          text={`${done.documentType} · ${done.fullName} · ${formatAgo(done.submittedAt)}. Người duyệt của Ghim sẽ xem — bạn vẫn dùng app như thường trong lúc chờ.`}
        />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <SafetyNote text="Xác minh là tự nguyện: không xác minh vẫn đăng tin, nhắn tin như thường. Số giấy tờ chỉ người duyệt của Ghim thấy, không hiện ra hồ sơ công khai." />
            <Text style={styles.label}>Loại giấy tờ</Text>
            <View style={styles.choices}>
              {ID_DOCUMENT_TYPES.map((t) => (
                <Choice
                  key={t.value}
                  align="left"
                  label={t.label}
                  selected={t.value === type}
                  onPress={() => setType(t.value)}
                />
              ))}
            </View>
            <Field
              label={`Số ${type}`}
              value={number}
              onChangeText={setNumber}
              keyboardType={type === 'Hộ chiếu' ? 'default' : 'number-pad'}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={
                type === 'CCCD' ? '12 chữ số' : type === 'CMND' ? '9 chữ số' : 'C1234567'
              }
            />
            {issue && (
              <View style={styles.warn}>
                <Feather name="alert-circle" size={14} color={C.warnTx} />
                <Text style={styles.warnText}>{issue}</Text>
              </View>
            )}
            <Field
              label="Họ và tên như trên giấy tờ"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="Nguyễn Văn A"
            />
            <PinButton
              label="Gửi hồ sơ xác minh"
              disabled={!number.trim() || issue !== null || name.trim().length < 2}
              loading={submit.isPending}
              onPress={() =>
                submit.mutate(
                  { documentType: type, documentNumber: number, fullName: name },
                  { onError: (e) => toast(e.message) },
                )
              }
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.md },
  label: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  choices: { gap: S.sm },
  warn: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
  warnText: { fontFamily: F.ui, fontSize: 12, color: C.warnTx },
});
