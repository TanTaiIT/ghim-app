import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState, Loading } from '@/components/ui';
import { useConfig, useConfigVersion } from '@/queries/ops-admin';
import { C, F, R, S } from '@/theme';
import { formatDate } from '@/utils/format';

/**
 * Một phiên bản cũ của bảng con số (master): chỉ đọc, chỉ liệt kê khoá khác bản hiện hành. Server chỉ tra theo số
 * phiên bản, nên lùi / tiến từng bản. Muốn quay lại con số cũ thì đặt lại ở bảng hiện hành — thành một phiên bản mới.
 */
export default function OpsConfigVersion() {
  const { version = '1' } = useLocalSearchParams<{ version: string }>();
  const router = useRouter();
  const n = Number(version);
  const current = useConfig().data;
  const old = useConfigVersion(n);

  const go = (to: number) => router.setParams({ version: String(to) });

  if (old.isPending) return <Loading />;
  const diff =
    old.data && current
      ? Object.keys(current.values)
          .sort()
          .filter((k) => old.data.values[k] !== current.values[k])
      : [];

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title={`Phiên bản ${n}`}
        sub={
          old.data
            ? `${formatDate(old.data.createdAt)}${old.data.note ? ` · ${old.data.note}` : ''}`
            : ''
        }
      />
      {old.isError ? (
        <EmptyState icon="clock" text={old.error.message} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.note}>
            {diff.length === 0
              ? `Giống hệt phiên bản hiện hành (${current?.version ?? '…'}).`
              : `${diff.length} con số khác phiên bản hiện hành (${current?.version ?? '…'}):`}
          </Text>
          {diff.map((k) => (
            <View key={k} style={styles.row}>
              <Text style={styles.key}>{k}</Text>
              <Text style={styles.value}>
                {old.data?.values[k] ?? '—'} → {current?.values[k]}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
      <ActionBar note={null}>
        <BarButton tone="ghost" label="Bản trước" disabled={n <= 1} onPress={() => go(n - 1)} />
        <BarButton
          tone="ghost"
          label="Bản sau"
          disabled={current === undefined || n + 1 >= current.version}
          onPress={() => go(n + 1)}
        />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.xs },
  note: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft, marginBottom: S.sm },
  row: {
    gap: 2,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    backgroundColor: C.paperWarm,
  },
  key: { fontFamily: F.ui, fontSize: 13, color: C.inkMid },
  value: { fontFamily: F.uiBold, fontSize: 14, color: C.ink },
});
