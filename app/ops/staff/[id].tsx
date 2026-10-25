import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { Check } from '@/components/Chip';
import { OpsHeader, useOpsBack } from '@/components/OpsHeader';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, OutlineButton } from '@/components/ui';
import { useOpsCategories } from '@/queries/ops-catalog';
import { useOpsAccount } from '@/queries/ops-people';
import { useOpsStaff, useRestoreStaff, useRevokeStaff, useSetStaff } from '@/queries/ops-staff';
import { STAFF_SCOPE_LABEL, type OpsStaff, type StaffScope } from '@/api/ops';
import { C, F, R, S } from '@/theme';
import { formatDate } from '@/utils/format';

const SCOPES = Object.keys(STAFF_SCOPE_LABEL) as StaffScope[];

/** Đổi chỗ một phần tử trong danh sách chọn. */
const toggled = <T,>(list: readonly T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

/**
 * Quyền staff của một tài khoản (master): việc toàn hệ thống và danh mục được giao. Lưu gửi TRỌN phạm vi — bỏ tích là
 * thu phần đó ngay. Bỏ hết thì thu hẳn bằng nút "Thu quyền" (server không nhận phạm vi rỗng).
 */
export default function OpsStaffEdit() {
  const { id = '', name } = useLocalSearchParams<{ id: string; name?: string }>();
  const staff = useOpsStaff(null);
  const account = useOpsAccount(id).data;
  const display = account?.displayName || name || 'Tài khoản';

  if (staff.isPending) return <Loading />;
  if (staff.isError) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title={display} />
        <EmptyState icon="lock" text={staff.error.message} />
      </View>
    );
  }
  const current = staff.data.find((s) => s.accountId === id) ?? null;
  // `key` theo phạm vi đang lưu: lưu xong server trả bản mới, form dựng lại từ đó.
  return (
    <StaffForm
      key={
        current
          ? `${current.scopes.join()}|${current.categoryIds.join()}|${current.suspended}`
          : 'new'
      }
      id={id}
      display={display}
      current={current}
    />
  );
}

function StaffForm({
  id,
  display,
  current,
}: {
  id: string;
  display: string;
  current: OpsStaff | null;
}) {
  const back = useOpsBack();
  const toast = useToast();
  const categories = useOpsCategories().data ?? [];
  const save = useSetStaff(id);
  const revoke = useRevokeStaff(id);
  const restore = useRestoreStaff(id);
  const [scopes, setScopes] = useState<StaffScope[]>(current?.scopes ?? []);
  const [categoryIds, setCategoryIds] = useState<string[]>(current?.categoryIds ?? []);
  const [confirm, setConfirm] = useState(false);

  const dirty =
    !current || !sameSet(scopes, current.scopes) || !sameSet(categoryIds, current.categoryIds);
  const empty = scopes.length + categoryIds.length === 0;
  const fail = (e: Error) => toast(e.message);
  const sub = current
    ? current.suspended
      ? 'Quyền đang treo'
      : `Staff từ ${formatDate(current.grantedAt)}`
    : 'Chưa mang quyền staff';

  return (
    <View style={styles.screen}>
      <OpsHeader back title={display} sub={sub} />
      <ScrollView contentContainerStyle={styles.content}>
        {current?.suspended && (
          <View style={styles.warn}>
            <Text style={styles.warnText}>
              Đang treo: {current.suspendedReason ?? 'không rõ lý do'}. Mở khoá tài khoản không tự
              trả quyền — trả lại đúng phạm vi lúc treo, hoặc thu hẳn.
            </Text>
            <OutlineButton
              compact
              label="Trả lại quyền"
              onPress={() =>
                !restore.isPending &&
                restore.mutate(undefined, {
                  onSuccess: () => toast('Đã trả lại quyền staff'),
                  onError: fail,
                })
              }
            />
          </View>
        )}
        <Text style={styles.section}>Việc toàn hệ thống</Text>
        <View style={styles.card}>
          {SCOPES.map((s) => (
            <Check
              key={s}
              checked={scopes.includes(s)}
              label={STAFF_SCOPE_LABEL[s]}
              onPress={() => setScopes((v) => toggled(v, s))}
            />
          ))}
        </View>
        <Text style={styles.section}>Danh mục được duyệt tin</Text>
        <View style={styles.card}>
          {categories.length === 0 ? (
            <Text style={styles.meta}>Chưa có danh mục nào.</Text>
          ) : (
            categories.map((c) => (
              <Check
                key={c.id}
                checked={categoryIds.includes(c.id)}
                label={c.active ? c.name : `${c.name} (đang tắt)`}
                onPress={() => setCategoryIds((v) => toggled(v, c.id))}
              />
            ))
          )}
        </View>
        {empty && current && (
          <Text style={styles.meta}>Bỏ hết thì dùng "Thu quyền" — phạm vi không được rỗng.</Text>
        )}
      </ScrollView>

      <ActionBar>
        {current && (
          <BarButton
            tone="danger"
            label="Thu quyền"
            disabled={revoke.isPending}
            onPress={() => setConfirm(true)}
          />
        )}
        <BarButton
          icon="check"
          label={current ? 'Lưu' : 'Gắn quyền'}
          disabled={!dirty || empty}
          loading={save.isPending}
          onPress={() =>
            save.mutate(
              { scopes, categoryIds },
              {
                onSuccess: () => toast(current ? 'Đã lưu quyền staff' : `${display} là staff`),
                onError: fail,
              },
            )
          }
        />
      </ActionBar>

      <ConfirmSheet
        visible={confirm}
        title={`Thu toàn bộ quyền staff của ${display}?`}
        confirmLabel="Thu quyền"
        note="Có hiệu lực ngay; việc người này đang nhận trả về hàng chờ"
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          revoke.mutate(undefined, {
            onSuccess: () => {
              toast(`Đã thu quyền staff của ${display}`);
              back();
            },
            onError: fail,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  section: { fontFamily: F.uiBold, fontSize: 14, color: C.ink },
  card: {
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  meta: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  warn: {
    gap: S.sm,
    padding: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.warnLine,
    backgroundColor: C.warnWash,
  },
  warnText: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.warnTx },
});
