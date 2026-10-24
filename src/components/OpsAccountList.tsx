import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { OpsAccount, OpsAccountStatus } from '@/api/ops';
import { Avatar } from './Avatar';
import { Chip } from './Chip';
import { EmptyState, GhostButton, Loading, Tag } from './ui';
import { useAccountSearch } from '@/queries/ops-people';
import { C, F, R, S } from '@/theme';
import { formatDate } from '@/utils/format';

export const ACCOUNT_STATUS: Record<
  OpsAccountStatus,
  { label: string; tone: 'brand' | 'amber' | 'boost' }
> = {
  active: { label: 'Đang hoạt động', tone: 'brand' },
  pending_verification: { label: 'Chưa xác nhận email', tone: 'amber' },
  locked: { label: 'Đang khoá', tone: 'boost' },
};

const FILTERS: { value: OpsAccountStatus | null; label: string }[] = [
  { value: null, label: 'Mọi trạng thái' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'pending_verification', label: 'Chưa xác nhận' },
  { value: 'locked', label: 'Đang khoá' },
];

/**
 * Mục "Tất cả" của tab Người dùng: tìm theo tên hay email, lọc trạng thái, phân trang (`GET /ops/accounts`). Tìm khi
 * bấm tìm trên bàn phím, không theo từng phím — mỗi lượt là một request của bàn vận hành. Tên phải gõ đúng dấu; email
 * thì không dấu sẵn (design add-ops-account-directory, Risks).
 */
export function OpsAccountList({ onOpen }: { onOpen: (account: OpsAccount) => void }) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<OpsAccountStatus | null>(null);
  const [page, setPage] = useState(1);
  const accounts = useAccountSearch(q, status, page);
  const data = accounts.data;

  const search = (next: string) => {
    setQ(next.trim());
    setPage(1);
  };
  const filter = (next: OpsAccountStatus | null) => {
    setStatus(next);
    setPage(1);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.search}>
        <Feather name="search" size={18} color={C.inkSoft} />
        <TextInput
          accessibilityLabel="Tìm người dùng"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => search(text)}
          placeholder="Tên đúng dấu hoặc email"
          placeholderTextColor={C.muted}
          returnKeyType="search"
          autoCapitalize="none"
          style={styles.input}
        />
        {text !== '' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xoá tìm kiếm"
            onPress={() => {
              setText('');
              search('');
            }}
            hitSlop={8}
          >
            <Feather name="x" size={18} color={C.inkSoft} />
          </Pressable>
        )}
      </View>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Chip
            key={f.label}
            label={f.label}
            selected={status === f.value}
            onPress={() => filter(f.value)}
          />
        ))}
      </View>
      {accounts.isPending ? (
        <Loading />
      ) : accounts.isError ? (
        <EmptyState icon="lock" text={accounts.error.message} />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          onRefresh={() => void accounts.refetch()}
          refreshing={accounts.isRefetching}
          ListEmptyComponent={
            <EmptyState
              icon="users"
              text={q ? `Không có ai khớp “${q}”.` : 'Chưa có tài khoản nào ở mục này.'}
            />
          }
          ListFooterComponent={
            data && data.totalPages > 1 ? (
              <View style={styles.pager}>
                <GhostButton label="Trước" onPress={() => setPage((p) => Math.max(1, p - 1))} />
                <Text style={styles.pageText}>
                  Trang {data.page}/{data.totalPages} · {data.total} tài khoản
                </Text>
                <GhostButton
                  label="Sau"
                  onPress={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const tag = ACCOUNT_STATUS[item.status];
            return (
              <Pressable accessibilityRole="button" onPress={() => onOpen(item)} style={styles.row}>
                <Avatar name={item.displayName} size={44} />
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.displayName}
                    {item.role === 'master' ? ' · Master' : ''}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.email}
                  </Text>
                  <Text style={styles.meta}>
                    {item.tier}
                    {item.struck ? ' · đang có cảnh cáo' : ''} · tham gia{' '}
                    {formatDate(item.createdAt)}
                  </Text>
                </View>
                <Tag label={tag.label} tone={tag.tone} />
                <Feather name="chevron-right" size={18} color={C.muted} />
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    marginHorizontal: S.lg,
    marginTop: S.md,
    paddingHorizontal: S.md,
    height: 44,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.lineStrong,
    backgroundColor: C.paperWarm,
  },
  input: { flex: 1, fontFamily: F.ui, fontSize: 15, color: C.ink },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S.sm,
    padding: S.lg,
    paddingBottom: S.sm,
  },
  list: { paddingHorizontal: S.lg, paddingBottom: S.lg, gap: S.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  pageText: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
});
