import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { InputSheet } from '@/components/InputSheet';
import { OpsHeader } from '@/components/OpsHeader';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, GhostButton, IconButton, Loading, Tag } from '@/components/ui';
import type { DisposableDomain } from '@/api/ops-admin';
import { useAddDomain, useDomains, useRemoveDomain } from '@/queries/ops-admin';
import { C, F, R, S } from '@/theme';
import { formatDate } from '@/utils/format';

/**
 * Miền email dùng một lần (master, spec identity/registration): email ở miền đang chặn không đăng ký được. Danh sách
 * nạp sẵn và tự cập nhật; master thêm tay hay bỏ chặn. Miền đã bỏ vẫn hiện — để lượt cập nhật tự động không thêm lại.
 */
export default function OpsDomains() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const domains = useDomains(page);
  const add = useAddDomain();
  const remove = useRemoveDomain();
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<DisposableDomain | null>(null);
  const last = domains.data?.totalPages ?? 1;

  return (
    <View style={styles.screen}>
      <OpsHeader
        back
        title="Miền email dùng một lần"
        sub={domains.data ? `${domains.data.total} miền · trang ${page}/${last}` : ''}
        right={
          <IconButton
            icon="plus"
            label="Thêm miền"
            variant="glass"
            onPress={() => setAdding(true)}
          />
        }
      />
      {domains.isPending ? (
        <Loading />
      ) : domains.isError ? (
        <EmptyState icon="mail" text={domains.error.message} />
      ) : (
        <FlatList
          data={domains.data.items}
          keyExtractor={(d) => d.domain}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="mail" text="Chưa có miền nào." />}
          renderItem={({ item }) => (
            <View style={[styles.row, item.removedAt !== null && styles.off]}>
              <View style={styles.body}>
                <Text style={styles.domain}>{item.domain}</Text>
                <Text style={styles.meta}>
                  {item.manual ? 'Thêm tay' : 'Danh sách nạp sẵn'} · {formatDate(item.addedAt)}
                </Text>
              </View>
              {item.removedAt !== null ? (
                <Tag label="Đã bỏ chặn" />
              ) : (
                <GhostButton label="Bỏ chặn" onPress={() => setPicked(item)} />
              )}
            </View>
          )}
        />
      )}
      <ActionBar note={null}>
        <BarButton
          tone="ghost"
          label="Trang trước"
          disabled={page <= 1}
          onPress={() => setPage(page - 1)}
        />
        <BarButton
          tone="ghost"
          label="Trang sau"
          disabled={page >= last}
          onPress={() => setPage(page + 1)}
        />
      </ActionBar>
      <InputSheet
        visible={adding}
        title="Chặn một miền email"
        note="Email ở miền này không đăng ký được tài khoản mới"
        label="Miền"
        placeholder="vd: mailinator.com"
        confirmLabel="Chặn miền"
        busy={add.isPending}
        inputProps={{ autoCapitalize: 'none', keyboardType: 'email-address' }}
        onClose={() => setAdding(false)}
        onSubmit={(domain) =>
          add.mutate(domain, {
            onSuccess: () => {
              setAdding(false);
              toast(`Đã chặn ${domain.trim().toLowerCase()}`);
            },
            onError: (e) => toast(e.message),
          })
        }
      />
      <ConfirmSheet
        visible={picked !== null}
        title={`Bỏ chặn ${picked?.domain ?? ''}?`}
        confirmLabel="Bỏ chặn"
        note="Email ở miền này đăng ký lại được; lượt cập nhật tự động không chặn lại miền này"
        onClose={() => setPicked(null)}
        onConfirm={() =>
          picked &&
          remove.mutate(picked.domain, {
            onSuccess: () => toast(`Đã bỏ chặn ${picked.domain}`),
            onError: (e) => toast(e.message),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  list: { padding: S.lg, gap: S.sm },
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
  off: { opacity: 0.6 },
  body: { flex: 1, gap: 2 },
  domain: { fontFamily: F.uiSemi, fontSize: 15, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
});
