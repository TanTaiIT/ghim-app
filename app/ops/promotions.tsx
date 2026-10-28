import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { InputSheet } from '@/components/InputSheet';
import { OpsHeader } from '@/components/OpsHeader';
import { ConfirmSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { EmptyState, Loading, OutlineButton, Tag } from '@/components/ui';
import { PRODUCT_SCOPE_LABEL, type OpsProduct } from '@/api/ops-admin';
import { PROMOTION_EFFECT_LABEL } from '@/api/promotion';
import { useMe } from '@/queries/account';
import { useOpsProducts, useUpdateProduct } from '@/queries/ops-admin';
import { C, F, R, S } from '@/theme';

type Sheet =
  { kind: 'toggle'; product: OpsProduct } | { kind: 'price'; product: OpsProduct } | null;

/**
 * Catalog gói đẩy tin trả Xu (ghim-server add-promotions), chỉ master: xem mọi gói kể cả đã tắt, đổi giá, bật tắt,
 * thêm gói mới. Không xoá gói — lượt mua đã có trỏ tới nó; tắt thì người đăng không thấy nữa, lượt đang chạy chạy
 * tới hết hạn. Xu không mua bằng tiền nên không có doanh thu ở đây.
 */
export default function OpsPromotions() {
  const router = useRouter();
  const toast = useToast();
  const isMaster = useMe().data?.isMaster ?? false;
  const products = useOpsProducts();
  const update = useUpdateProduct();
  const [sheet, setSheet] = useState<Sheet>(null);

  const patch = (code: string, body: Parameters<typeof update.mutate>[0]['patch'], done: string) =>
    update.mutate(
      { code, patch: body },
      {
        onSuccess: () => {
          setSheet(null);
          toast(done);
        },
        onError: (e) => toast(e.message),
      },
    );

  if (!isMaster) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Gói đẩy tin" />
        <EmptyState icon="lock" text="Chỉ master soạn gói đẩy tin." />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Gói đẩy tin" sub="Người đăng dùng Xu để mua — Xu do master cấp" />
      <ScrollView contentContainerStyle={styles.content}>
        <OutlineButton label="Thêm gói" onPress={() => router.push('/ops/promotions/new')} />
        {products.isPending ? (
          <Loading />
        ) : products.isError ? (
          <EmptyState icon="alert-circle" text={products.error.message} />
        ) : products.data.length === 0 ? (
          <EmptyState
            icon="zap"
            text="Chưa có gói nào. Server chèn bộ khởi đầu lúc khởi động khi bảng trống."
          />
        ) : (
          products.data.map((p) => (
            <View key={p.code} style={[styles.card, !p.active && styles.cardOff]}>
              <View style={styles.tags}>
                <Tag
                  label={PROMOTION_EFFECT_LABEL[p.effect]}
                  tone={p.effect === 'featured' ? 'boost' : 'brand'}
                />
                <Tag
                  label={p.active ? 'Đang bật' : 'Đã tắt'}
                  tone={p.active ? 'brand' : 'neutral'}
                />
                <Tag label={`Từ ${p.minTier}`} />
              </View>
              <Text style={styles.name}>
                {p.name} · {p.price} Xu
              </Text>
              <Text style={styles.meta}>
                Mã {p.code}
                {p.durationDays !== null ? ` · ${p.durationDays} ngày` : ''} · chờ {p.cooldownHours}{' '}
                giờ · {PRODUCT_SCOPE_LABEL[p.scope]}
              </Text>
              {p.description && <Text style={styles.meta}>{p.description}</Text>}
              <View style={styles.actions}>
                <OutlineButton
                  compact
                  label="Đổi giá"
                  onPress={() => setSheet({ kind: 'price', product: p })}
                />
                <OutlineButton
                  compact
                  label={p.active ? 'Tắt gói' : 'Bật gói'}
                  onPress={() => setSheet({ kind: 'toggle', product: p })}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <InputSheet
        visible={sheet?.kind === 'price'}
        title={`Giá gói ${sheet?.product.name ?? ''}`}
        note="Lượt mua đã có giữ giá cũ. Giá từ 1 Xu."
        label="Giá (Xu)"
        initial={sheet?.kind === 'price' ? String(sheet.product.price) : ''}
        confirmLabel="Lưu giá"
        inputProps={{ keyboardType: 'number-pad' }}
        busy={update.isPending}
        onClose={() => setSheet(null)}
        onSubmit={(text) => {
          const price = Number.parseInt(text, 10);
          if (!Number.isInteger(price) || price < 1) return toast('Giá phải là số nguyên từ 1');
          if (sheet?.kind === 'price') patch(sheet.product.code, { price }, 'Đã đổi giá');
        }}
      />
      <ConfirmSheet
        visible={sheet?.kind === 'toggle'}
        title={
          sheet?.product.active
            ? `Tắt gói ${sheet.product.name}?`
            : `Bật gói ${sheet?.product.name ?? ''}?`
        }
        confirmLabel={sheet?.product.active ? 'Tắt' : 'Bật'}
        note={
          sheet?.product.active
            ? 'Người đăng không thấy gói nữa; lượt đang chạy chạy tới hết hạn.'
            : 'Người đăng thấy gói trở lại với giá và thời hạn hiện có.'
        }
        onClose={() => setSheet(null)}
        onConfirm={() => {
          if (sheet?.kind === 'toggle') {
            patch(
              sheet.product.code,
              { active: !sheet.product.active },
              sheet.product.active ? 'Đã tắt gói' : 'Đã bật gói',
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  card: {
    gap: 6,
    padding: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  cardOff: { opacity: 0.7 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  name: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  actions: { flexDirection: 'row', gap: S.sm, marginTop: 4 },
});
