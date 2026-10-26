import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiError } from '@/api/http';
import { ActionBar, BarButton } from '@/components/ActionBar';
import { OpsHeader } from '@/components/OpsHeader';
import { ConfirmSheet, PickerSheet } from '@/components/PickerSheet';
import { useToast } from '@/components/Toast';
import { Loading } from '@/components/ui';
import { useListing } from '@/queries/listings';
import { useReasonTemplates, useRemoveListing, useRestoreListing } from '@/queries/ops-review';
import { C, F, R, S } from '@/theme';
import { formatVnd } from '@/utils/format';

/**
 * Gỡ thẳng hay khôi phục một tin sàn chung (staff được giao danh mục của tin, master), không qua việc. Bàn vận hành
 * không có API đọc tin đã gỡ, nên màn đọc tin như người xem: đọc được và tin còn hiện thì mời gỡ; 404 — tin đã gỡ (hay
 * không còn) — thì mời khôi phục. Gỡ xong vẫn ở đây để khôi phục ngay nếu gỡ nhầm.
 */
export default function OpsListing() {
  const { id = '', title } = useLocalSearchParams<{ id: string; title?: string }>();
  const router = useRouter();
  const toast = useToast();
  const listing = useListing(id);
  const reasons = useReasonTemplates().data?.filter((r) => r.active) ?? [];
  const remove = useRemoveListing();
  const restore = useRestoreListing();
  const [sheet, setSheet] = useState<'reason' | 'restore' | null>(null);

  if (listing.isPending) return <Loading />;
  const l = listing.data;
  const hidden = listing.error instanceof ApiError && listing.error.status === 404;
  const busy = remove.isPending || restore.isPending;
  const name = l?.title ?? title ?? 'Tin đăng';

  const note = l
    ? !l.marketplace
      ? 'Tin chỉ đăng trong nhóm — gỡ khỏi nhóm là việc của quản trị nhóm.'
      : l.ended
        ? 'Tin đã bán hay đã hết hạn — không còn gì để gỡ.'
        : 'Tin đang hiện ở sàn chung. Gỡ ở mức "sai sót": người đăng thấy lý do mẫu và sửa được.'
    : hidden
      ? 'Không xem được tin này như người dùng — tin đang bị gỡ, hay không còn. Khôi phục thì tin hiện lại với số ngày còn lại lúc bị gỡ.'
      : (listing.error?.message ?? '');

  return (
    <View style={styles.screen}>
      <OpsHeader back title="Gỡ / khôi phục tin" sub={name} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{name}</Text>
          {l && (
            <Text style={styles.meta}>
              {formatVnd(l.price)} · {l.seller.name}
            </Text>
          )}
          <Text style={styles.note}>{note}</Text>
        </View>
      </ScrollView>

      <ActionBar note={null}>
        {l && (
          <BarButton
            tone="ghost"
            label="Xem tin"
            disabled={busy}
            onPress={() => router.push(`/listing/${id}`)}
          />
        )}
        {l?.marketplace && !l.ended && (
          <BarButton
            tone="danger"
            label="Gỡ vì sai sót"
            loading={remove.isPending}
            disabled={busy}
            onPress={() => setSheet('reason')}
          />
        )}
        {hidden && (
          <BarButton
            label="Khôi phục tin"
            loading={restore.isPending}
            disabled={busy}
            onPress={() => setSheet('restore')}
          />
        )}
      </ActionBar>

      <PickerSheet
        visible={sheet === 'reason'}
        title="Gỡ vì lý do"
        options={reasons.map((r) => ({ value: r.id, label: r.text }))}
        value={null}
        onClose={() => setSheet(null)}
        onSelect={(reasonTemplateId) =>
          remove.mutate(
            { id, reasonTemplateId },
            { onSuccess: () => toast('Đã gỡ tin'), onError: (e) => toast(e.message) },
          )
        }
      />
      <ConfirmSheet
        visible={sheet === 'restore'}
        title={`Khôi phục ${name}?`}
        confirmLabel="Khôi phục tin"
        note="Tin hiện lại ở sàn chung, ngày hiển thị chạy tiếp từ lúc bị gỡ"
        onClose={() => setSheet(null)}
        onConfirm={() =>
          restore.mutate(id, {
            onSuccess: () => toast('Đã khôi phục tin'),
            onError: (e) => toast(e.message),
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  card: {
    gap: S.sm,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  title: { fontFamily: F.uiBold, fontSize: 16, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 13, color: C.inkSoft },
  note: { fontFamily: F.ui, fontSize: 14, lineHeight: 21, color: C.inkMid },
});
