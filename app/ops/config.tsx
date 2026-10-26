import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { InputSheet } from '@/components/InputSheet';
import { OpsHeader } from '@/components/OpsHeader';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading } from '@/components/ui';
import type { ConfigVersion } from '@/api/ops-admin';
import { useConfig, useSaveConfig } from '@/queries/ops-admin';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/** Khoá có dạng `<phần>.<tên>` (TK 28): xếp theo phần, như bảng con số của TK. */
const sectionsOf = (values: Record<string, number>) => {
  const byPart = new Map<string, string[]>();
  for (const key of Object.keys(values).sort()) {
    const part = key.split('.')[0] ?? key;
    byPart.set(part, [...(byPart.get(part) ?? []), key]);
  }
  return [...byPart].map(([title, data]) => ({ title, data }));
};

/**
 * Bảng con số có phiên bản (master, TK 28): sửa nhiều con số rồi lưu một lần thành phiên bản mới, có hiệu lực ngay.
 * Server kiểm sàn / trần từng khoá và trả câu lỗi; ai khác vừa lưu trước thì 409 — tải lại rồi sửa tiếp.
 */
export default function OpsConfig() {
  const config = useConfig();
  if (config.isPending) return <Loading />;
  if (config.isError) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Bảng con số" />
        <EmptyState icon="sliders" text={config.error.message} />
      </View>
    );
  }
  return <Editor key={config.data.version} current={config.data} />;
}

function Editor({ current }: { current: ConfigVersion }) {
  const router = useRouter();
  const toast = useToast();
  const save = useSaveConfig();
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const count = Object.keys(changes).length;
  const valueOf = (key: string) => changes[key] ?? current.values[key];

  const set = (key: string, text: string) => {
    const n = Number(text.trim());
    if (!Number.isInteger(n)) {
      toast('Con số phải là số nguyên');
      return;
    }
    setChanges(({ [key]: _, ...rest }) =>
      n === current.values[key] ? rest : { ...rest, [key]: n },
    );
    setEditing(null);
  };

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title="Bảng con số"
        sub={`Phiên bản ${current.version} · ${formatAgo(current.createdAt)}${current.note ? ` · ${current.note}` : ''}`}
      />
      <SectionList
        sections={sectionsOf(current.values)}
        keyExtractor={(k) => k}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sửa ${item}`}
            onPress={() => setEditing(item)}
            style={[styles.row, item in changes && styles.changed]}
          >
            <Text style={styles.key}>{item.slice(item.indexOf('.') + 1)}</Text>
            <Text style={styles.value}>
              {item in changes ? `${current.values[item]} → ${changes[item]}` : valueOf(item)}
            </Text>
          </Pressable>
        )}
      />
      <ActionBar note={null}>
        <BarButton
          tone="ghost"
          label="Phiên bản cũ"
          disabled={current.version <= 1}
          onPress={() =>
            router.push({
              pathname: '/ops/config/[version]',
              params: { version: String(current.version - 1) },
            })
          }
        />
        <BarButton
          label={count > 0 ? `Lưu ${count} thay đổi` : 'Lưu'}
          disabled={count === 0}
          loading={save.isPending}
          onPress={() => setSaving(true)}
        />
      </ActionBar>
      <InputSheet
        visible={editing !== null}
        title={editing ?? ''}
        note={editing ? `Phiên bản ${current.version}: ${current.values[editing]}` : undefined}
        label="Giá trị mới"
        initial={editing ? String(valueOf(editing)) : ''}
        confirmLabel="Đặt"
        inputProps={{ keyboardType: 'number-pad' }}
        onClose={() => setEditing(null)}
        onSubmit={(text) => editing && set(editing, text)}
      />
      <InputSheet
        visible={saving}
        title={`Lưu ${count} thay đổi thành phiên bản ${current.version + 1}?`}
        note="Có hiệu lực ngay. Ghi chú (không bắt buộc) giúp người sau biết vì sao đổi."
        label="Ghi chú"
        confirmLabel="Lưu phiên bản"
        minLength={0}
        busy={save.isPending}
        onClose={() => setSaving(false)}
        onSubmit={(note) =>
          save.mutate(
            { baseVersion: current.version, changes, note: note.trim() || undefined },
            {
              onSuccess: (v) => {
                setSaving(false);
                toast(`Đã lưu phiên bản ${v.version}`);
              },
              onError: (e) => {
                setSaving(false);
                toast(e.message);
              },
            },
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  list: { padding: S.lg, gap: S.xs },
  section: { marginTop: S.md, fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    backgroundColor: C.paperWarm,
  },
  changed: { borderWidth: 1, borderColor: C.brand },
  key: { flex: 1, fontFamily: F.ui, fontSize: 13, color: C.inkMid },
  value: { fontFamily: F.uiBold, fontSize: 14, color: C.ink },
});
