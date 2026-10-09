import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Photo } from '@/components/Photo';
import { StepHeader, useClosePost } from '@/components/StepHeader';
import { useToast } from '@/components/Toast';
import { PinButton, Price, Tag } from '@/components/ui';
import { useMe } from '@/queries/account';
import { useMyGroups } from '@/queries/groups';
import { useBoostPlans, useCategories, usePublishListing } from '@/queries/selling';
import { CONDITION_LABEL } from '@/api/client';
import { snapshotDraft, useDraftStore } from '@/stores/draft';
import { C, F, R, S } from '@/theme';
import { formatVnd } from '@/utils/format';

/** Thiết kế để trống giá gói (chưa chốt) — giữ nguyên chỗ trống thay vì bịa một con số. */
const PRICE_TBD = '[Giá gói]';

/** Bước 3 — xem trước như người mua sẽ thấy, tóm tắt kèm nút Sửa, gói tăng hiển thị tuỳ chọn. */
export default function PostPreview() {
  const router = useRouter();
  const toast = useToast();
  const close = useClosePost();

  const d = useDraftStore();
  const me = useMe();
  const groups = useMyGroups();
  const categories = useCategories();
  const plans = useBoostPlans();
  const publish = usePublishListing();

  const cover = d.photos[0];
  const category = categories.data?.find((c) => c.id === d.categoryId);
  const place = d.place ?? me.data?.place;
  const picked = groups.data?.filter((g) => d.groupIds.includes(g.id)).map((g) => g.name) ?? [];

  // "Sửa" ở dòng bước 1 lùi về đầu stack con; dòng bước 2 chỉ lùi một màn.
  const toStep1 = () => router.dismissAll();
  const toStep2 = () => router.back();
  const rows = [
    {
      k: 'Danh mục',
      v: category ? [category.name, d.brand].filter(Boolean).join(' › ') : '—',
      edit: toStep1,
    },
    { k: 'Tình trạng', v: d.condition ? CONDITION_LABEL[d.condition] : '—', edit: toStep1 },
    { k: 'Hiển thị', v: ['Toàn sàn', ...picked].join(' + '), edit: toStep2 },
    { k: 'Trả giá', v: d.allowOffers ? 'Cho phép' : 'Không', edit: toStep2 },
  ];

  const submit = () =>
    publish.mutate(snapshotDraft(), {
      onSuccess: () => {
        close();
        useDraftStore.getState().reset();
        toast('Đã gửi tin — tin hiển thị sau khi được duyệt (Cá nhân › Đang đăng)');
      },
      onError: (e) => toast(e.message),
    });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StepHeader step={3} caption="Xem trước & đăng" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.h2}>Người mua sẽ thấy tin như sau</Text>
          <View style={styles.card}>
            {cover && <Photo picture={cover} style={styles.thumb} />}
            <View style={styles.cardBody}>
              <Text style={styles.title}>{d.title}</Text>
              <Price value={d.price} size={16} />
              <Text style={styles.meta}>{place?.district ?? ''} · Vừa xong</Text>
              {d.condition && <Tag label={CONDITION_LABEL[d.condition]} tone="brand" />}
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

        <View style={styles.section}>
          <View>
            <Text style={styles.h2}>
              Tăng hiển thị <Text style={styles.optional}>(tuỳ chọn)</Text>
            </Text>
            <Text style={styles.small}>Bỏ qua nếu bạn muốn đăng tin thường.</Text>
          </View>
          {plans.data?.map((p) => {
            const on = d.boostId === p.id;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => d.patch({ boostId: on ? null : p.id })}
                style={[styles.plan, on && styles.planOn]}
              >
                <View style={styles.planIcon}>
                  <Feather name="zap" size={20} color={C.price} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.planName}>{p.name}</Text>
                  <Text style={styles.small}>{p.note}</Text>
                </View>
                <Text style={styles.planPrice}>
                  {p.price === null ? PRICE_TBD : formatVnd(p.price)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.small}>
          Tin sẽ hiển thị sau khi được duyệt. Khi đăng tin, bạn đồng ý với{' '}
          <Text style={styles.link} onPress={() => router.push('/help')}>
            Quy chế hoạt động
          </Text>{' '}
          của sàn.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <PinButton
          label={d.boostId ? 'Đăng tin & tăng hiển thị' : 'Đăng tin'}
          loading={publish.isPending}
          onPress={submit}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  flex: { flex: 1 },
  content: { padding: S.lg, paddingTop: 18, gap: S.lg + 4 },
  section: { gap: 10 },
  h2: { fontFamily: F.uiBold, fontSize: 15, color: C.ink },
  optional: { fontFamily: F.uiMedium, color: C.inkSoft },
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
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: 14,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
  },
  planOn: { borderWidth: 1.5, borderColor: C.price, backgroundColor: C.warnWash },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: R.sm,
    backgroundColor: C.boost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: { fontFamily: F.uiBold, fontSize: 14, color: C.ink },
  planPrice: { fontFamily: F.uiBold, fontSize: 13, color: C.boostTx },
  footer: {
    paddingTop: S.md,
    paddingHorizontal: S.lg,
    paddingBottom: S.sm,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.paperWarm,
  },
});
