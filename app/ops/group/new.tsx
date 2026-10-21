import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Choice } from '@/components/Chip';
import { Field } from '@/components/Field';
import { OpsHeader, useOpsBack } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { PinButton } from '@/components/ui';
import { useCreateOpsGroup } from '@/queries/ops-groups';
import {
  GROUP_KIND_LABEL,
  GROUP_MODE_LABEL,
  type OpsGroupKind,
  type OpsGroupMode,
} from '@/api/ops';
import { C, F, S } from '@/theme';

const KINDS = Object.keys(GROUP_KIND_LABEL) as OpsGroupKind[];
const MODES = Object.keys(GROUP_MODE_LABEL) as OpsGroupMode[];

/** Lập nhóm (master). Nhóm mới ở trạng thái "chờ giao chủ" tới khi có người nhận làm chủ. */
export default function OpsGroupNew() {
  const back = useOpsBack();
  const toast = useToast();
  const create = useCreateOpsGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<OpsGroupKind>('community');
  const [mode, setMode] = useState<OpsGroupMode>('public_review');

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Lập nhóm" sub="Nhóm chờ giao chủ tới khi có người nhận" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Field label="Tên nhóm" value={name} onChangeText={setName} placeholder="Xe cổ Sài Gòn" />
          <Field
            label="Giới thiệu"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Nhóm dành cho…"
          />
          <Text style={styles.label}>Loại nhóm</Text>
          <View style={styles.choices}>
            {KINDS.map((k) => (
              <Choice
                key={k}
                label={GROUP_KIND_LABEL[k]}
                selected={k === kind}
                onPress={() => setKind(k)}
              />
            ))}
          </View>
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
          <PinButton
            label="Lập nhóm"
            disabled={name.trim().length < 2}
            loading={create.isPending}
            onPress={() =>
              create.mutate(
                { name, kind, mode, description },
                {
                  onSuccess: () => {
                    toast(`Đã lập nhóm ${name.trim()}`);
                    back();
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
  label: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  choices: { gap: S.sm },
});
