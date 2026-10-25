import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { Choice } from '@/components/Chip';
import { Field } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, PinButton, SafetyNote, ScreenHeader } from '@/components/ui';
import { useMyIdVerification, useSubmitIdVerification } from '@/queries/account';
import {
  ID_DOCUMENT_TYPES,
  idNumberIssue,
  type IdDocumentType,
  type IdSubmission,
} from '@/api/client';
import { C, F, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/**
 * Xác minh giấy tờ (spec id-verification): tự nguyện, không chặn gì và không đổi việc đăng tin, mức tin cậy hay máy
 * duyệt. Số giấy tờ chỉ người duyệt thấy, không bao giờ hiện ra ngoài. Màn đọc hồ sơ nộp gần nhất: đang chờ hay đã xác
 * minh thì chỉ hiện trạng thái (server không nhận hồ sơ thứ hai khi đang chờ); bị từ chối thì hiện lý do kèm form nộp lại.
 */
export default function VerifyId() {
  const mine = useMyIdVerification();
  const latest = mine.data;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Xác minh tài khoản" />
      {mine.isPending ? (
        <Loading />
      ) : mine.isError ? (
        <EmptyState icon="alert-circle" text={mine.error.message} />
      ) : latest?.status === 'pending' ? (
        <EmptyState
          icon="clock"
          title="Đang chờ duyệt"
          text={`${latest.documentType} · ${latest.fullName} · ${formatAgo(latest.submittedAt)}. Người duyệt của Ghim sẽ xem — bạn vẫn dùng app như thường trong lúc chờ.`}
        />
      ) : latest?.status === 'verified' ? (
        <EmptyState
          icon="check-circle"
          title="Đã xác minh"
          text={`${latest.documentType} · ${latest.fullName}. Xác minh không đổi quyền hay hạn mức nào của bạn.`}
        />
      ) : (
        <SubmitForm rejected={latest ?? null} />
      )}
    </SafeAreaView>
  );
}

function SubmitForm({ rejected }: { rejected: IdSubmission | null }) {
  const toast = useToast();
  const submit = useSubmitIdVerification();
  const [type, setType] = useState<IdDocumentType>('CCCD');
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const issue = number.trim() ? idNumberIssue(type, number) : null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {rejected && (
          <SafetyNote
            title="Hồ sơ trước bị từ chối"
            text={`${rejected.reason ?? 'Người duyệt không ghi lý do'}. Sửa lại rồi gửi lần nữa.`}
          />
        )}
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
          placeholder={type === 'CCCD' ? '12 chữ số' : type === 'CMND' ? '9 chữ số' : 'C1234567'}
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
