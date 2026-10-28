import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { Avatar } from '@/components/Avatar';
import { InputSheet } from '@/components/InputSheet';
import { OpsHeader } from '@/components/OpsHeader';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { WalletAdjustSheet } from '@/components/WalletAdjustSheet';
import { EmptyState, Loading, OutlineButton, Tag } from '@/components/ui';
import { useMe } from '@/queries/account';
import { useAdjustWallet, useOpsWallet } from '@/queries/ops-admin';
import { ACCOUNT_STATUS } from '@/components/OpsAccountList';
import {
  useAccountStrikes,
  useLockAccount,
  useOpsAccount,
  useUnlockAccount,
} from '@/queries/ops-people';
import { WALLET_TYPE_LABEL } from '@/api/client';
import { STRIKE_KIND_LABEL, STRIKE_STATUS_LABEL } from '@/api/ops';
import { C, F, R, S } from '@/theme';
import { daysUntil, formatAgo, formatDate } from '@/utils/format';

/**
 * Hồ sơ một người: thẻ tài khoản (`/ops/accounts/:id` — trạng thái, email, mức tin cậy, điểm vi phạm) và lịch sử
 * cảnh cáo. Tên theo tham số từ màn trước chỉ là chỗ dựa lúc thẻ chưa tải. Master thấy đúng một nút theo trạng thái:
 * Khoá khi đang mở, Mở khoá khi đang khoá — cạnh nút gắn / sửa quyền staff của người này. Khối "Ví Xu" (add-wallet)
 * chỉ master thấy: số dư, 20 dòng gần nhất, hộp cấp / trừ.
 */
export default function OpsUser() {
  const { id = '', name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const toast = useToast();
  const isMaster = useMe().data?.isMaster ?? false;
  const strikes = useAccountStrikes(id);
  const lock = useLockAccount();
  const unlock = useUnlockAccount();
  const [sheet, setSheet] = useState<'lock' | 'unlock' | 'wallet' | null>(null);
  const wallet = useOpsWallet(id, isMaster);
  const adjust = useAdjustWallet(id);
  const account = useOpsAccount(id).data;
  const display = account?.displayName || name || 'Người dùng';
  const statusTag = account ? ACCOUNT_STATUS[account.status] : null;
  const inForce = strikes.data?.filter((s) => s.inForce) ?? [];

  return (
    <View style={styles.screen}>
      <OpsHeader back title={display} sub={`Mã tài khoản ${id.slice(0, 8)}…`} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Avatar name={display} size={64} />
          <View style={styles.cardBody}>
            <Text style={styles.name}>{display}</Text>
            {account && statusTag && (
              <>
                <Text style={styles.meta}>{account.email}</Text>
                <Text style={styles.meta}>
                  {account.tier} · {account.strikePoints} điểm vi phạm · tham gia{' '}
                  {formatDate(account.createdAt)}
                </Text>
                <View style={styles.tags}>
                  <Tag label={statusTag.label} tone={statusTag.tone} />
                </View>
                {account.lockedReason && (
                  <Text style={styles.meta}>Lý do khoá: {account.lockedReason}</Text>
                )}
              </>
            )}
            <Text style={styles.meta}>
              {strikes.data
                ? `${inForce.length} cảnh cáo đang tính · ${strikes.data.length} cảnh cáo từng nhận`
                : 'Đang tải hồ sơ cảnh cáo'}
            </Text>
          </View>
        </View>

        {isMaster && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>
                Ví Xu{wallet.data ? ` · ${wallet.data.balance} Xu` : ''}
              </Text>
              {wallet.data && (
                <OutlineButton compact label="Cấp / trừ Xu" onPress={() => setSheet('wallet')} />
              )}
            </View>
            {wallet.isPending ? (
              <Loading />
            ) : wallet.isError ? (
              <EmptyState icon="alert-circle" text={wallet.error.message} />
            ) : wallet.data.transactions.length === 0 ? (
              <Text style={styles.meta}>Ví chưa có biến động nào.</Text>
            ) : (
              wallet.data.transactions.map((t) => (
                <View key={t.id} style={styles.strike}>
                  <View style={styles.walletRow}>
                    <Text style={styles.rule}>{WALLET_TYPE_LABEL[t.type]}</Text>
                    <Text style={[styles.amount, t.amount > 0 ? styles.credit : styles.debit]}>
                      {t.amount > 0 ? '+' : '−'}
                      {Math.abs(t.amount)}
                    </Text>
                  </View>
                  {t.note && <Text style={styles.meta}>{t.note}</Text>}
                  <Text style={styles.meta}>
                    {formatAgo(t.at)} · số dư sau {t.balanceAfter} Xu
                  </Text>
                </View>
              ))
            )}
          </>
        )}

        <Text style={styles.section}>Lịch sử cảnh cáo</Text>
        {isMaster && (strikes.data?.length ?? 0) > 0 && (
          <OutlineButton
            compact
            label="Ân xá / gỡ khoá vĩnh viễn"
            onPress={() =>
              router.push({ pathname: '/ops/strikes/[id]', params: { id, name: display } })
            }
          />
        )}
        {strikes.isPending ? (
          <Loading />
        ) : strikes.isError ? (
          <EmptyState icon="alert-circle" text={strikes.error.message} />
        ) : strikes.data.length === 0 ? (
          <EmptyState icon="shield" text="Chưa từng nhận cảnh cáo nào." />
        ) : (
          strikes.data.map((s) => (
            <View key={s.id} style={styles.strike}>
              <View style={styles.tags}>
                <Tag
                  label={STRIKE_KIND_LABEL[s.kind]}
                  tone={s.kind === 'normal' ? 'neutral' : 'boost'}
                />
                <Tag label={STRIKE_STATUS_LABEL[s.status]} tone={s.inForce ? 'amber' : 'neutral'} />
                {s.appeal && <Tag label={`Khiếu nại: ${APPEAL[s.appeal]}`} />}
              </View>
              <Text style={styles.rule}>{s.rule}</Text>
              <Text style={styles.meta}>
                {s.points} điểm · ra {formatAgo(s.issuedAt)}
                {s.inForce && s.expiresAt ? ` · còn ${daysUntil(s.expiresAt)} ngày` : ''}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {isMaster && account && (
        <ActionBar>
          <BarButton
            tone="ghost"
            icon="shield"
            label="Quyền staff"
            onPress={() =>
              router.push({ pathname: '/ops/staff/[id]', params: { id, name: display } })
            }
          />
          {account.status === 'locked' ? (
            <BarButton
              tone="ghost"
              icon="unlock"
              label="Mở khoá"
              loading={unlock.isPending}
              onPress={() => setSheet('unlock')}
            />
          ) : (
            <BarButton
              tone="danger"
              icon="lock"
              label="Khoá tài khoản"
              loading={lock.isPending}
              onPress={() => setSheet('lock')}
            />
          )}
        </ActionBar>
      )}

      <InputSheet
        visible={sheet === 'lock'}
        title={`Khoá ${display}?`}
        note="Mọi phiên đăng nhập bị thu hồi ngay; người này đọc được lý do khi đăng nhập lại."
        label="Lý do khoá"
        placeholder="Lừa đặt cọc qua chuyển khoản"
        confirmLabel="Khoá"
        tone="danger"
        minLength={3}
        busy={lock.isPending}
        onClose={() => setSheet(null)}
        onSubmit={(reason) =>
          lock.mutate(
            { id, reason },
            {
              onSuccess: () => {
                setSheet(null);
                toast(`Đã khoá ${display}`);
              },
              onError: (e) => toast(e.message),
            },
          )
        }
      />
      <WalletAdjustSheet
        visible={sheet === 'wallet'}
        name={display}
        balance={wallet.data?.balance ?? 0}
        busy={adjust.isPending}
        onClose={() => setSheet(null)}
        onSubmit={(input) =>
          adjust.mutate(input, {
            onSuccess: ({ balance }) => {
              setSheet(null);
              toast(
                `${input.amount > 0 ? 'Đã cấp' : 'Đã trừ'} ${Math.abs(input.amount)} Xu · số dư ${balance} Xu`,
              );
            },
            onError: (e) => toast(e.message),
          })
        }
      />
      <ConfirmSheet
        visible={sheet === 'unlock'}
        title={`Mở khoá ${display}?`}
        confirmLabel="Mở khoá"
        note="Đóng luôn đánh dấu “dùng máy của tài khoản bị khoá” liên quan"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          unlock.mutate(id, {
            onSuccess: () => toast(`Đã mở khoá ${display}`),
            onError: (e) => toast(e.message),
          })
        }
      />
    </View>
  );
}

const APPEAL = { pending: 'đang chờ', won: 'thắng', lost: 'thua', closed: 'đã đóng' } as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.lg,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  cardBody: { flex: 1, gap: 2 },
  name: { fontFamily: F.uiBold, fontSize: 17, color: C.ink },
  meta: { fontFamily: F.uiMedium, fontSize: 12, color: C.inkSoft },
  section: { marginTop: S.sm, fontFamily: F.uiBold, fontSize: 16, color: C.ink },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  walletRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { fontFamily: F.uiBold, fontSize: 16 },
  credit: { color: C.brandDark },
  debit: { color: C.price },
  strike: {
    gap: 6,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rule: { fontFamily: F.ui, fontSize: 14, lineHeight: 20, color: C.ink },
});
