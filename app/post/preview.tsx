import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Photo } from '@/components/Photo';
import { StepHeader, useClosePost } from '@/components/StepHeader';
import { useToast } from '@/components/Toast';
import { PinButton, Price } from '@/components/ui';
import { useCategories, useProvinces, useWards } from '@/queries/catalog';
import { usePublishListing } from '@/queries/posting';
import { hasPendingUploads, snapshotDraft, useDraftStore } from '@/stores/draft';
import { C, F, R, S } from '@/theme';
import { formatPlace } from '@/utils/format';

/**
 * Bước 3 — xem trước như người mua sẽ thấy, tóm tắt kèm nút Sửa. Thiết kế có mục "Tăng hiển thị": gói đẩy tin
 * chưa có ở server (`add-promotions`), nên chưa hiện.
 */
export default function PostPreview() {
  const router = useRouter();
  const toast = useToast();
  const close = useClosePost();

  const d = useDraftStore();
  const categories = useCategories();
  const provinces = useProvinces();
  const wards = useWards(d.provinceCode);
  const publish = usePublishListing();

  const cover = d.photos.find((p) => p.imageId !== null);
  const category = categories.data?.find((c) => c.id === d.categoryId);
  const place = {
    province: provinces.data?.find((p) => p.code === d.provinceCode)?.name ?? '',
    ward: wards.data?.find((w) => w.code === d.wardCode)?.name ?? null,
  };
  const uploading = hasPendingUploads(d);

  // "Sửa" ở dòng bước 1 lùi về đầu stack con; dòng bước 2 chỉ lùi một màn.
  const toStep1 = () => router.dismissAll();
  const toStep2 = () => router.back();
  const rows = [
    { k: 'Danh mục', v: category?.name ?? '—', edit: toStep1 },
    { k: 'Khu vực', v: formatPlace(place) || '—', edit: toStep2 },
    { k: 'Hiển thị', v: 'Toàn sàn', edit: toStep2 },
    { k: 'Trả giá', v: d.negotiable ? 'Cho phép' : 'Không', edit: toStep2 },
  ];

  const submit = () =>
    publish.mutate(snapshotDraft(), {
      onSuccess: () => {
        useDraftStore.getState().reset();
        close();
        toast(
          d.editingLive
            ? 'Đã lưu thay đổi — phần nội dung sửa sẽ được kiểm tra lại'
            : 'Đã gửi tin — đang kiểm tra, xem ở Cá nhân › Đang đăng',
        );
      },
      onError: (e) => toast(e.message),
    });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StepHeader
        step={3}
        title={d.editingLive ? 'Sửa tin' : 'Đăng tin mới'}
        caption="Xem trước & đăng"
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.h2}>Người mua sẽ thấy tin như sau</Text>
          <View style={styles.card}>
            {cover && <Photo picture={{ uri: cover.uri }} style={styles.thumb} />}
            <View style={styles.cardBody}>
              <Text style={styles.title}>{d.title}</Text>
              <Price value={d.price} size={16} />
              <Text style={styles.meta}>{formatPlace(place, true)} · Vừa xong</Text>
            </View>
          </View>
        </View>

        <View style={styles.summary}>
          {rows.map((r, i) => (
            <View key={r.k} style={[styles.row, i < rows.length - 1 && styles.rowLine]}>
              <Text style={styles.rowKey}>{r.k}</Text>
              <Text style={styles.rowValue}>{r.v}</Text>
              <Pressable accessibilityRole="button" onPress={r.edit} hitSlop={8}>
                <Text style={styles.edit}>Sửa</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <Text style={styles.small}>
          {uploading ? 'Đang tải ảnh lên, chờ xong rồi đăng. ' : ''}
          Tin sẽ hiển thị sau khi được duyệt. Khi đăng tin, bạn đồng ý với{' '}
          <Text style={styles.link} onPress={() => router.push('/help')}>
            Quy chế hoạt động
          </Text>{' '}
          của sàn.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <PinButton
          label={d.editingLive ? 'Lưu thay đổi' : 'Đăng tin'}
          disabled={uploading || !cover}
          loading={publish.isPending}
          onPress={submit}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, paddingTop: 18, gap: S.lg + 4 },
  section: { gap: 10 },
  h2: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  small: { fontFamily: F.ui, fontSize: 12, lineHeight: 18, color: C.inkSoft },
  link: { fontFamily: F.uiSemi, color: C.brandTx },
  card: {
    flexDirection: 'row',
    gap: S.md,
    padding: 10,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  thumb: { width: 100, height: 100, borderRadius: R.sm },
  cardBody: { flex: 1, minWidth: 0, gap: S.xs, paddingTop: 2 },
  title: { fontFamily: F.uiSemi, fontSize: 15, lineHeight: 20, color: C.ink },
  meta: { fontFamily: F.ui, fontSize: 12, color: C.muted },
  summary: {
    paddingVertical: S.xs,
    paddingHorizontal: 14,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: C.line },
  rowKey: { width: 104, fontFamily: F.ui, fontSize: 13, color: C.inkSoft },
  rowValue: { flex: 1, fontFamily: F.uiSemi, fontSize: 14, color: C.ink },
  edit: {
    paddingVertical: S.md,
    paddingLeft: S.sm,
    fontFamily: F.uiBold,
    fontSize: 13,
    color: C.brandTx,
  },
  footer: {
    paddingTop: S.md,
    paddingHorizontal: S.lg,
    paddingBottom: S.sm,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.paperWarm,
  },
});
