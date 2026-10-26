import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState, Loading } from '@/components/ui';
import { RISK_LABEL } from '@/api/ops';
import { useCategorySettingsVersion } from '@/queries/ops-admin';
import { C, F, R, S } from '@/theme';
import { formatDate, formatVnd } from '@/utils/format';

const GROUP_REVIEW = { group: 'Điều hành viên của nhóm', platform: 'Staff của sàn' } as const;

/**
 * Lịch sử cài đặt máy duyệt của một danh mục (master): mỗi lần lưu là một phiên bản; lượt duyệt ghi phiên bản nó đã
 * dùng, nên tra bản cũ là biết vì sao một tin cũ bị giữ. Server chỉ tra theo số — lùi / tiến từng bản từ bản hiện hành.
 */
export default function OpsCategoryHistory() {
  const {
    id = '',
    name = '',
    version = '1',
    latest = '1',
  } = useLocalSearchParams<{ id: string; name?: string; version?: string; latest?: string }>();
  const router = useRouter();
  const n = Number(version);
  const top = Number(latest);
  const settings = useCategorySettingsVersion(id, n);
  const s = settings.data;

  const rows: [string, string][] = s
    ? [
        ['Trần giá', s.priceCap === null ? 'Không đặt' : formatVnd(s.priceCap)],
        ['Giá tham chiếu', s.referencePrice === null ? 'Không có' : formatVnd(s.referencePrice)],
        ['Mức rủi ro', RISK_LABEL[s.riskLevel]],
        ['Luôn duyệt tay', s.alwaysManual ? 'Có' : 'Không'],
        ['Tin nhóm bị máy giữ', GROUP_REVIEW[s.groupReview]],
      ]
    : [];

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title={`Cài đặt phiên bản ${n}${n === top ? ' (hiện hành)' : ''}`}
        sub={s ? `${name} · ${formatDate(s.createdAt)}` : name}
      />
      {settings.isPending ? (
        <Loading />
      ) : settings.isError ? (
        <EmptyState icon="clock" text={settings.error.message} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            {rows.map(([k, v]) => (
              <View key={k} style={styles.kv}>
                <Text style={styles.key}>{k}</Text>
                <Text style={styles.value}>{v}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      <ActionBar note={null}>
        <BarButton
          tone="ghost"
          label="Bản trước"
          disabled={n <= 1}
          onPress={() => router.setParams({ version: String(n - 1) })}
        />
        <BarButton
          tone="ghost"
          label="Bản sau"
          disabled={n >= top}
          onPress={() => router.setParams({ version: String(n + 1) })}
        />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg },
  card: {
    gap: S.sm,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  kv: { flexDirection: 'row', gap: S.md },
  key: { flex: 1, fontFamily: F.ui, fontSize: 13, color: C.inkSoft },
  value: { flex: 1, fontFamily: F.uiSemi, fontSize: 13, color: C.ink },
});
