import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '@/components/Chip';
import { Field } from '@/components/Field';
import { useToast } from '@/components/Toast';
import {
  EmptyState,
  Loading,
  OutlineButton,
  PinButton,
  ScreenHeader,
  SectionTitle,
} from '@/components/ui';
import { useAddRoster, useRemoveRosterEntry } from '@/queries/group-manage';
import { useGroup } from '@/queries/groups';
import { isWholeManager, managerOf, ROSTER_BATCH_MAX } from '@/api/group-manage';
import { C, F, R, S } from '@/theme';

/** Email cách nhau bằng xuống dòng, dấu phẩy, chấm phẩy hay khoảng trắng — dán từ bảng tính là ra. */
const splitEmails = (text: string): string[] =>
  Array.from(
    new Set(
      text
        .split(/[\s,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

/**
 * Danh sách lớp: email của những người được vào nhóm ngay. Server chỉ giữ dấu băm nên không có danh sách để hiện lại —
 * gỡ bằng cách nhập đúng email (spec membership "Danh sách lớp").
 */
export default function GroupRoster() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const group = useGroup(id);
  const add = useAddRoster(id);
  const remove = useRemoveRosterEntry(id);
  const [text, setText] = useState('');
  const [unitId, setUnitId] = useState<string | null>(null);
  const [removal, setRemoval] = useState('');

  const g = managerOf(group.data);
  const allowed = g !== null && isWholeManager(g);
  const units = g?.units ?? [];
  const emails = splitEmails(text);
  const fail = (e: Error) => toast(e.message);

  if (group.isPending) return <Loading />;
  if (!allowed) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Danh sách lớp" />
        <EmptyState
          icon="lock"
          text={
            group.error?.message ?? 'Chỉ chủ nhóm và điều hành viên cả nhóm nạp được danh sách lớp.'
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Danh sách lớp" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.note}>
            <Text style={styles.noteText}>
              Người có email trong danh sách vào nhóm ngay ở mọi chế độ, với đường vào "danh sách
              lớp". Hệ thống chỉ giữ dấu băm của email nên không hiện lại danh sách — gỡ một người
              bằng cách nhập đúng email.
            </Text>
          </View>
          <Field
            label="Email, mỗi dòng một"
            value={text}
            onChangeText={setText}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder={'an@truong.vn\nbinh@truong.vn'}
            hint={`${emails.length}/${ROSTER_BATCH_MAX}`}
          />
          {units.length > 0 && (
            <View style={styles.units}>
              <Text style={styles.unitsLabel}>Vào lớp</Text>
              <Chip
                label="Không xếp lớp"
                selected={unitId === null}
                onPress={() => setUnitId(null)}
              />
              {units.map((u) => (
                <Chip
                  key={u.id}
                  label={u.name}
                  selected={unitId === u.id}
                  onPress={() => setUnitId(u.id)}
                />
              ))}
            </View>
          )}
          <PinButton
            label={emails.length ? `Thêm ${emails.length} email` : 'Thêm vào danh sách'}
            disabled={emails.length === 0 || emails.length > ROSTER_BATCH_MAX}
            loading={add.isPending}
            onPress={() =>
              add.mutate(
                emails.map((email) => ({ email, unitId })),
                {
                  onSuccess: (added) => {
                    setText('');
                    toast(`Đã thêm ${added} email vào danh sách`);
                  },
                  onError: fail,
                },
              )
            }
          />

          <SectionTitle title="Gỡ một email" />
          <Field
            label="Email cần gỡ"
            value={removal}
            onChangeText={setRemoval}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="an@truong.vn"
          />
          <OutlineButton
            label="Gỡ khỏi danh sách"
            onPress={() =>
              removal.trim() &&
              !remove.isPending &&
              remove.mutate(removal.trim().toLowerCase(), {
                onSuccess: () => {
                  setRemoval('');
                  toast('Đã gỡ khỏi danh sách');
                },
                onError: fail,
              })
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: S.lg, gap: S.md },
  note: {
    padding: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.brandLine,
    backgroundColor: C.brandWash,
  },
  noteText: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.brandDark },
  units: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: S.sm },
  unitsLabel: { fontFamily: F.uiMedium, fontSize: 13, color: C.inkSoft },
});
