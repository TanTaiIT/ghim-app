import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WALLET_TYPE_LABEL, type WalletTransaction } from '@/api/client';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, OutlineButton, ScreenHeader } from '@/components/ui';
import { useOpenConversation } from '@/queries/messages';
import { useMyWallet, useMyWalletTransactions } from '@/queries/wallet';
import { C, F, R, S } from '@/theme';
import { formatAgo } from '@/utils/format';

/**
 * Ví Xu của tôi (TK 19, ghim-server add-wallet): số dư và sổ cái mới trước — mỗi dòng có loại, số Xu, số dư sau và lý
 * do master ghi. Xu không mua bằng tiền: ai cần thì nhắn Hỗ trợ Ghim, nên nút duy nhất là mở hội thoại hỗ trợ.
 */
export default function Wallet() {
  const router = useRouter();
  const toast = useToast();
  const balance = useMyWallet();
  const history = useMyWalletTransactions();
  const openChat = useOpenConversation();

  const askForXu = () =>
    openChat.mutate(
      { kind: 'support' },
      { onSuccess: (id) => router.push(`/chat/${id}`), onError: (e) => toast(e.message) },
    );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Ví Xu" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={balance.isRefetching || history.isRefetching}
            onRefresh={() => {
              void balance.refetch();
              void history.refetch();
            }}
          />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Số dư</Text>
          <Text style={styles.heroValue}>
            {balance.isPending ? '…' : balance.isError ? '—' : `${balance.data} Xu`}
          </Text>
          <Text style={styles.heroNote}>
            Xu dùng để mua gói đẩy tin. Xu không mua bằng tiền và không hết hạn — cần thêm thì nhắn
            Hỗ trợ Ghim.
          </Text>
          <OutlineButton
            label="Nhắn Hỗ trợ Ghim để xin Xu"
            onPress={() => {
              if (!openChat.isPending) askForXu();
            }}
          />
        </View>

        <Text style={styles.section}>Lịch sử</Text>
        {history.isPending ? (
          <Loading />
        ) : history.isError ? (
          <EmptyState icon="wifi-off" text={history.error.message} />
        ) : history.data.length === 0 ? (
          <EmptyState icon="credit-card" text="Ví chưa có biến động nào." />
        ) : (
          history.data.map((t) => <TransactionRow key={t.id} item={t} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TransactionRow({ item }: { item: WalletTransaction }) {
  const credit = item.amount > 0;
  return (
    <View style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{WALLET_TYPE_LABEL[item.type]}</Text>
        {item.note && <Text style={styles.rowNote}>{item.note}</Text>}
        <Text style={styles.rowMeta}>
          {formatAgo(item.at)} · số dư sau {item.balanceAfter} Xu
        </Text>
      </View>
      <Text style={[styles.amount, credit ? styles.credit : styles.debit]}>
        {credit ? '+' : '−'}
        {Math.abs(item.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  hero: {
    gap: S.sm,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.brandLine,
    backgroundColor: C.brandWash,
  },
  heroLabel: { fontFamily: F.uiSemi, fontSize: 13, color: C.brandDark },
  heroValue: { fontFamily: F.uiBlack, fontSize: 32, color: C.brandDark },
  heroNote: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkMid },
  section: { marginTop: S.sm, fontFamily: F.uiBold, fontSize: 16, color: C.ink },
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
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  rowNote: { fontFamily: F.ui, fontSize: 13, lineHeight: 18, color: C.inkMid },
  rowMeta: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  amount: { fontFamily: F.uiBold, fontSize: 18 },
  credit: { color: C.brandDark },
  debit: { color: C.price },
});
