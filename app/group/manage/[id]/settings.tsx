import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Choice } from '@/components/Chip';
import { Field } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, PinButton, ScreenHeader } from '@/components/ui';
import { useUpdateGroupSettings } from '@/queries/group-manage';
import { useGroup } from '@/queries/groups';
import {
  managerOf,
  modeNoteOf,
  type GroupSettingsPatch,
  type ManagedGroup,
} from '@/api/group-manage';
import { GROUP_MODE_LABEL, isPublicGroup, type GroupMode } from '@/api/client';
import { C, F, R, S } from '@/theme';

const MODES = Object.keys(GROUP_MODE_LABEL) as GroupMode[];

/** Cài đặt nhóm — quyền riêng của chủ nhóm (spec group-modes). */
export default function GroupSettings() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(id);
  const g = managerOf(group.data);

  if (group.isPending) return <Loading />;
  if (!g || g.role !== 'owner') {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Cài đặt nhóm" />
        <EmptyState icon="lock" text={group.error?.message ?? 'Chỉ chủ nhóm đổi được cài đặt.'} />
      </SafeAreaView>
    );
  }
  // `key` theo lượt hồ sơ đổi: lưu xong server trả bản mới, form dựng lại từ đó thay vì giữ bản gõ dở.
  return (
    <SettingsForm key={`${g.mode}:${g.name}:${g.description ?? ''}:${g.manualReview}`} group={g} />
  );
}

/**
 * Form dựng từ hồ sơ hiện có, chỉ gửi khoá đã đổi. Hai công tắc theo luật server: "nhận tin người ngoài" chỉ ở nhóm
 * công khai, "hiện tên nhóm trên tin sàn" chỉ khi nhóm đang riêng tư và vẫn riêng tư — nếu không là 409.
 */
function SettingsForm({ group: g }: { group: ManagedGroup }) {
  const toast = useToast();
  const save = useUpdateGroupSettings(g.id);
  const [name, setName] = useState(g.name);
  const [description, setDescription] = useState(g.description ?? '');
  const [mode, setMode] = useState<GroupMode>(g.mode);
  const [allowOutsiders, setAllowOutsiders] = useState(g.allowOutsiders);
  const [showName, setShowName] = useState(g.showNameOnMarketplace);
  const [boardStyle, setBoardStyle] = useState(g.boardStyle);
  const [manualReview, setManualReview] = useState(g.manualReview);

  const publicTarget = isPublicGroup(mode);
  const privateBoth = !publicTarget && !isPublicGroup(g.mode);
  const patch: GroupSettingsPatch = {
    ...(name.trim() !== g.name && { name: name.trim() }),
    ...(description.trim() !== (g.description ?? '') && {
      description: description.trim() || null,
    }),
    ...(mode !== g.mode && { mode }),
    ...(publicTarget && allowOutsiders !== g.allowOutsiders && { allowOutsiders }),
    ...(privateBoth && showName !== g.showNameOnMarketplace && { showNameOnMarketplace: showName }),
    ...(boardStyle !== g.boardStyle && { boardStyle }),
    ...(manualReview !== g.manualReview && { manualReview }),
  };
  const dirty = Object.keys(patch).length > 0;
  const note = modeNoteOf(g.mode, mode);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Cài đặt nhóm" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label="Tên nhóm" value={name} onChangeText={setName} maxLength={80} />
          <Field
            label="Giới thiệu"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={1000}
            hint={`${description.length}/1000`}
            placeholder="Nhóm dành cho…"
          />
          <Text style={styles.label}>Cách vào nhóm</Text>
          <View style={styles.choices}>
            {MODES.map((m) => (
              <Choice
                key={m}
                align="left"
                label={GROUP_MODE_LABEL[m]}
                selected={m === mode}
                onPress={() => setMode(m)}
              />
            ))}
          </View>
          {note && (
            <View style={styles.note}>
              <Text style={styles.noteText}>{note}</Text>
            </View>
          )}
          {publicTarget && (
            <Check
              checked={allowOutsiders}
              label="Nhận tin người ngoài (đăng tin «công khai trong nhóm»)"
              onPress={() => setAllowOutsiders((v) => !v)}
            />
          )}
          {privateBoth && (
            <Check
              checked={showName}
              label="Hiện tên nhóm trên tin sàn của thành viên"
              onPress={() => setShowName((v) => !v)}
            />
          )}
          <Text style={styles.label}>Kiểu bảng tin</Text>
          <View style={styles.choices}>
            <Choice
              label="Dạng dòng"
              selected={boardStyle === 'list'}
              onPress={() => setBoardStyle('list')}
            />
            <Choice
              label="Dạng lưới"
              selected={boardStyle === 'grid'}
              onPress={() => setBoardStyle('grid')}
            />
          </View>
          <Text style={styles.label}>Duyệt tin</Text>
          <Check
            checked={manualReview}
            label="Duyệt tay mọi tin trước khi hiện"
            onPress={() => setManualReview((v) => !v)}
          />
          <Text style={styles.hint}>
            {manualReview
              ? 'Tin đăng mới và tin gửi lại của mọi thành viên chờ điều hành viên hoặc chủ nhóm duyệt, kể cả khi máy cho qua. Sửa tin đang hiện vẫn chỉ qua máy.'
              : 'Máy duyệt tự động: tin máy cho qua hiện ngay, tin máy giữ mới chờ người duyệt.'}
            {manualReview !== g.manualReview && !manualReview
              ? ' Tin đang chờ vẫn chờ người duyệt.'
              : ''}
          </Text>
          <PinButton
            label="Lưu cài đặt"
            disabled={!dirty || name.trim().length === 0}
            loading={save.isPending}
            onPress={() =>
              save.mutate(patch, {
                onSuccess: () =>
                  toast(
                    patch.mode && isPublicGroup(g.mode) && !publicTarget
                      ? 'Đã lưu — nhóm chuyển sang riêng tư sau khi hạ xong tin công khai'
                      : 'Đã lưu cài đặt',
                  ),
                onError: (e) => toast(e.message),
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
  label: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  hint: { marginTop: -S.sm, fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  choices: { gap: S.sm },
  note: {
    padding: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.warnLine,
    backgroundColor: C.warnWash,
  },
  noteText: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.warnTx },
});
