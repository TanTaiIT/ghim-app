import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { Field } from '@/components/Field';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState, Loading } from '@/components/ui';
import type { AuditFilter } from '@/api/ops-admin';
import { useAudit } from '@/queries/ops-admin';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Nhật ký vận hành (master, TK 6): mọi việc của master và staff — ai làm, lúc nào, với cái gì, lý do. Mới trước. Lọc
 * theo mã đối tượng (tin, tài khoản, nhóm…): dán mã vào ô lọc.
 */
export default function OpsAudit() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const id = query.trim();
  const filter: AuditFilter = UUID.test(id) ? { targetId: id } : {};
  // Server trả theo thời gian tăng dần: trang 1 của màn là trang cuối của server, đảo trong trang — mới nhất lên đầu.
  const probe = useAudit(1, filter);
  const last = Math.max(1, probe.data?.totalPages ?? 1);
  const audit = useAudit(Math.max(1, last - page + 1), filter);
  // Hermes chưa có `toReversed`; mảng vừa chép nên đảo tại chỗ không đụng cache.
  // oxlint-disable-next-line unicorn/no-array-reverse
  const items = audit.data ? [...audit.data.items].reverse() : [];

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title="Nhật ký vận hành"
        sub={audit.data ? `${audit.data.total} dòng · trang ${page}/${last}` : ''}
      />
      <View style={styles.filter}>
        <Field
          label="Lọc theo mã đối tượng"
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setPage(1);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Dán mã tin, tài khoản, nhóm…"
        />
      </View>
      {probe.isPending || audit.isPending ? (
        <Loading />
      ) : audit.isError ? (
        <EmptyState icon="file-text" text={audit.error.message} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="file-text" text="Không có dòng nào." />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.action}>{item.action}</Text>
              <Text style={styles.meta}>
                {item.byMaster ? 'Master' : `Staff ${item.actorId?.slice(0, 8) ?? ''}`} ·{' '}
                {formatAgo(item.at)}
              </Text>
              <Text style={styles.meta} selectable>
                {item.target}
              </Text>
              {item.reason && <Text style={styles.text}>Lý do: {item.reason}</Text>}
              {item.details && (
                <Text style={styles.details} numberOfLines={3}>
                  {item.details}
                </Text>
              )}
            </View>
          )}
        />
      )}
      <ActionBar note={null}>
        <BarButton
          tone="ghost"
          label="Mới hơn"
          disabled={page <= 1}
          onPress={() => setPage(page - 1)}
        />
        <BarButton
          tone="ghost"
          label="Cũ hơn"
          disabled={page >= last}
          onPress={() => setPage(page + 1)}
        />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  filter: { paddingHorizontal: S.lg, paddingTop: S.md },
  list: { padding: S.lg, gap: S.sm },
  row: {
    gap: 2,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  action: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  text: { fontFamily: F.ui, fontSize: 13, color: C.inkMid },
  details: { fontFamily: F.ui, fontSize: 11, color: C.muted },
});
