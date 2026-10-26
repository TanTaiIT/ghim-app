import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Field } from '@/components/Field';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { PinButton } from '@/components/ui';
import { useCommentStrike } from '@/queries/ops-admin';
import { C, F, S } from '@/theme';

/** Bằng trần của server (`body` tối đa 2000 ký tự). */
const NOTE_MAX = 2000;

/**
 * Nhận xét vào hồ sơ vi phạm nghiêm trọng đang chờ master (staff, spec trust/serious-strikes): master đọc khi quyết.
 * Người ghi cảnh cáo không nhận xét vào cảnh cáo của chính mình — server từ chối kèm câu.
 */
export default function OpsStrikeNote() {
  const { id = '', taskId = '' } = useLocalSearchParams<{ id: string; taskId?: string }>();
  const router = useRouter();
  const toast = useToast();
  const comment = useCommentStrike(taskId);
  const [body, setBody] = useState('');

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Nhận xét cho master" sub="Vi phạm nghiêm trọng đang chờ quyết" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.note}>
            Ghi điều master cần biết khi quyết: bằng chứng thêm, bối cảnh, đề xuất của bạn.
          </Text>
          <Field
            label="Nhận xét"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={NOTE_MAX}
          />
          <PinButton
            label="Ghi nhận xét"
            disabled={body.trim() === ''}
            loading={comment.isPending}
            onPress={() =>
              comment.mutate(
                { strikeId: id, body },
                {
                  onSuccess: () => {
                    toast('Đã ghi nhận xét');
                    router.back();
                  },
                  onError: (e) => toast(e.message),
                },
              )
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.md },
  note: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
});
