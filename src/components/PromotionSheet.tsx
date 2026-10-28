import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { newIdempotencyKey } from '@/api/ops-admin';
import type { OwnerProduct } from '@/api/promotion';
import { useBuyPromotion, useListingPromotions } from '@/queries/promotion';
import { C, F, R, S } from '@/theme';
import { formatDate, formatMoment } from '@/utils/format';
import { BarButton } from './ActionBar';
import { useToast } from './Toast';
import { Loading } from './ui';

/**
 * Bảng gói đẩy tin cho một tin của tôi (ghim-server add-promotions): mỗi gói giá, thời hạn, mua được không và vì sao
 * chưa — server không ẩn gói. Chọn gói rồi xác nhận; khoá chống lặp sinh lúc mở bảng, không lúc bấm. Nội dung unmount
 * khi đóng nên lần mở sau là khoá mới và đọc lại số dư, thời gian chờ.
 */
export function PromotionSheet({
  listing,
  onClose,
}: {
  listing: { id: string; title: string } | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={listing !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
        <View style={styles.grip} />
        {listing && <SheetBody listing={listing} onClose={onClose} />}
      </View>
    </Modal>
  );
}

function SheetBody({
  listing,
  onClose,
}: {
  listing: { id: string; title: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [picked, setPicked] = useState<OwnerProduct | null>(null);
  const promotions = useListingPromotions(listing.id);
  const buy = useBuyPromotion(listing.id);

  const confirm = () => {
    if (!picked) return;
    buy.mutate(
      { productCode: picked.code, idempotencyKey },
      {
        onSuccess: (purchase) => {
          toast(
            purchase.expiresAt
              ? `Đã đặt nổi bật tới ${formatDate(purchase.expiresAt)}`
              : 'Đã đẩy tin lên đầu bảng tin',
          );
          onClose();
        },
        onError: (e) => toast(e.message),
      },
    );
  };

  return (
    <>
      <Text style={styles.title} numberOfLines={1}>
        Đẩy tin — {listing.title}
      </Text>
      {promotions.isPending ? (
        <Loading />
      ) : promotions.isError ? (
        <Text style={styles.text}>{promotions.error.message}</Text>
      ) : (
        <>
          <View style={styles.balanceRow}>
            <Text style={styles.text}>
              Ví của bạn: <Text style={styles.bold}>{promotions.data.balance} Xu</Text>
              {promotions.data.running?.expiresAt
                ? ` · đang nổi bật tới ${formatDate(promotions.data.running.expiresAt)}`
                : ''}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                router.push('/wallet');
              }}
            >
              <Text style={styles.link}>Xin Xu</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {promotions.data.products.map((p) => {
              const on = picked?.code === p.code;
              return (
                <Pressable
                  key={p.code}
                  accessibilityRole="button"
                  disabled={!p.purchasable}
                  onPress={() => setPicked(on ? null : p)}
                  style={[styles.row, on && styles.rowOn, !p.purchasable && styles.rowOff]}
                >
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>
                      {p.name} · {p.price} Xu
                    </Text>
                    {p.description && <Text style={styles.rowNote}>{p.description}</Text>}
                    {!p.purchasable && p.reason && (
                      <Text style={styles.rowWarn}>
                        {p.reason}
                        {p.retryAt && !/từ \d/.test(p.reason)
                          ? ` (từ ${formatMoment(p.retryAt)})`
                          : ''}
                      </Text>
                    )}
                  </View>
                  {on && <Feather name="check-circle" size={20} color={C.brand} />}
                </Pressable>
              );
            })}
            {promotions.data.products.length === 0 && (
              <Text style={styles.text}>Chưa có gói nào cho nơi đăng của tin này.</Text>
            )}
          </ScrollView>
          <View style={styles.actions}>
            <BarButton label="Đóng" tone="ghost" onPress={onClose} />
            <BarButton
              label={picked ? `Dùng ${picked.price} Xu` : 'Chọn gói'}
              disabled={!picked}
              loading={buy.isPending}
              onPress={confirm}
            />
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.scrim },
  sheet: {
    maxHeight: '85%',
    backgroundColor: C.paperWarm,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    paddingTop: S.sm,
    paddingHorizontal: S.lg,
    gap: S.md,
  },
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: R.full,
    backgroundColor: C.lineStrong,
  },
  title: { fontFamily: F.uiBold, fontSize: 17, color: C.ink, paddingTop: S.sm },
  text: { fontFamily: F.ui, fontSize: 13, lineHeight: 19, color: C.inkSoft },
  bold: { fontFamily: F.uiBold, color: C.ink },
  link: { fontFamily: F.uiBold, fontSize: 13, color: C.brand },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { flexGrow: 0 },
  listContent: { gap: S.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
  },
  rowOn: { borderColor: C.brand, backgroundColor: C.brandWash },
  rowOff: { opacity: 0.7 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  rowNote: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  rowWarn: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.warnTx },
  actions: { flexDirection: 'row', gap: 10 },
});
