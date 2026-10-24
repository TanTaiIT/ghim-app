import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '@/components/Chip';
import { Field } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, PinButton, ScreenHeader, useBack } from '@/components/ui';
import { usePostAnnouncement } from '@/queries/group-manage';
import { useGroup } from '@/queries/groups';
import { isWholeManager, managerOf } from '@/api/group-manage';
import { C, F, S } from '@/theme';

/**
 * Đăng thông báo của nhóm: thành viên thấy ở tab Giới thiệu và dòng ghim trên bảng tin. Điều hành viên lớp không chọn
 * nơi gửi — server gắn lớp của họ dù gửi gì.
 */
export default function GroupAnnounce() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const back = useBack();
  const toast = useToast();
  const group = useGroup(id);
  const post = usePostAnnouncement(id);
  const [body, setBody] = useState('');
  const [unitId, setUnitId] = useState<string | null>(null);

  const g = managerOf(group.data);
  const units = g?.units ?? [];
  const canPickUnit = g !== null && units.length > 0 && isWholeManager(g);

  if (group.isPending) return <Loading />;
  if (!g) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ScreenHeader title="Đăng thông báo" />
        <EmptyState
          icon="lock"
          text={group.error?.message ?? 'Bạn không có vai quản trị trong nhóm này.'}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Đăng thông báo" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field
            label="Nội dung"
            value={body}
            onChangeText={setBody}
            multiline
            autoFocus
            placeholder="Lịch họp phụ huynh, nội quy mua bán trong nhóm…"
          />
          {canPickUnit ? (
            <View style={styles.units}>
              <Text style={styles.unitsLabel}>Gửi tới</Text>
              <Chip label="Cả nhóm" selected={unitId === null} onPress={() => setUnitId(null)} />
              {units.map((u) => (
                <Chip
                  key={u.id}
                  label={u.name}
                  selected={unitId === u.id}
                  onPress={() => setUnitId(u.id)}
                />
              ))}
            </View>
          ) : (
            g.role === 'moderator' &&
            g.moderatorUnitId !== null && (
              <Text style={styles.unitsLabel}>Thông báo gửi tới lớp bạn phụ trách.</Text>
            )
          )}
          <PinButton
            label="Đăng thông báo"
            disabled={body.trim().length === 0}
            loading={post.isPending}
            onPress={() =>
              post.mutate(
                { body: body.trim(), unitId: canPickUnit ? unitId : null },
                {
                  onSuccess: () => {
                    toast('Đã đăng thông báo');
                    back();
                  },
                  onError: (e) => toast(e.message),
                },
              )
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
  units: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: S.sm },
  unitsLabel: { fontFamily: F.uiMedium, fontSize: 13, color: C.inkSoft },
});
