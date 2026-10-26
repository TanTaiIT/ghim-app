import { useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { managesGroup } from '@/api/client';
import { Gallery } from '@/components/Gallery';
import { useGuarded } from '@/components/GuestGate';
import {
  BadgeAdminRow,
  ListingDescription,
  ListingSummary,
  SellerCard,
  SimilarRail,
  SpecGrid,
} from '@/components/ListingInfo';
import { ConfirmSheet } from '@/components/PickerSheet';
import { ReportSheet } from '@/components/ReportSheet';
import { useToast } from '@/components/Toast';
import {
  EmptyState,
  IconButton,
  Loading,
  OutlineButton,
  PinButton,
  SafetyNote,
  useBack,
} from '@/components/ui';
import {
  useListing,
  useReportListing,
  useSavedIds,
  useSimilar,
  useToggleSaved,
} from '@/queries/listings';
import { useMyGroups, useRemoveGroupBadge } from '@/queries/groups';
import { useOpenConversation } from '@/queries/messages';
import { C, R, S } from '@/theme';
import { formatVnd } from '@/utils/format';

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const back = useBack();
  const toast = useToast();
  const guarded = useGuarded();
  const insets = useSafeAreaInsets();
  const [reporting, setReporting] = useState(false);
  const [unbadging, setUnbadging] = useState(false);

  const listing = useListing(id);
  const myGroups = useMyGroups();
  const removeBadge = useRemoveGroupBadge();
  const similar = useSimilar(id);
  const savedIds = useSavedIds();
  const toggleSaved = useToggleSaved();
  const report = useReportListing();
  const openChat = useOpenConversation();

  if (listing.isPending) return <Loading />;
  if (listing.isError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <IconButton icon="chevron-left" label="Quay lại" onPress={back} />
        <EmptyState icon="alert-circle" text={listing.error.message} />
      </View>
    );
  }

  const l = listing.data;
  const saved = savedIds.data?.has(l.id) ?? false;
  /** `offer` mở chat ở chế độ trả giá — nút "Trả giá" đưa thẳng tới ô nhập giá. */
  const chat = (offer: boolean) =>
    guarded(() =>
      openChat.mutate(
        { kind: 'listing', id: l.id },
        {
          onSuccess: (cid) =>
            router.push({
              pathname: '/chat/[id]',
              params: offer ? { id: cid, offer: '1' } : { id: cid },
            }),
          onError: (e) => toast(e.message),
        },
      ),
    );

  return (
    <View style={styles.screen}>
      <ScrollView>
        <Gallery photos={l.photos} height={320} />
        <View style={styles.sheet}>
          {l.ended && (
            <SafetyNote
              title={l.ended === 'sold' ? 'Tin đã bán' : 'Tin đã hết hạn'}
              text="Người bán không còn rao tin này: không mở được hội thoại mới hay trả giá. Hội thoại đã có vẫn nhắn tiếp được."
            />
          )}
          <ListingSummary listing={l} />
          {l.badge && managesGroup(myGroups.data ?? [], l.badge.groupId) && (
            <BadgeAdminRow name={l.badge.name} onRemove={() => setUnbadging(true)} />
          )}
          <SellerCard seller={l.seller} onOpen={() => router.push(`/user/${l.seller.id}`)} />
          {l.specs.length > 0 && <SpecGrid specs={l.specs} />}
          {l.description !== '' && <ListingDescription text={l.description} />}
          <SafetyNote
            title="Giao dịch an toàn"
            text="Kiểm tra hàng trước khi thanh toán, không chuyển khoản đặt cọc cho người lạ. Admin không bao giờ yêu cầu chuyển khoản qua tin nhắn."
          />
          {similar.data && similar.data.length > 0 && (
            <SimilarRail items={similar.data} onOpen={(sid) => router.push(`/listing/${sid}`)} />
          )}
        </View>
      </ScrollView>

      <View style={[styles.topBar, { top: insets.top + S.xs }]}>
        <IconButton variant="float" icon="chevron-left" label="Quay lại" onPress={back} />
        <View style={styles.topActions}>
          <IconButton
            variant="float"
            icon="heart"
            label={saved ? 'Bỏ lưu tin' : 'Lưu tin'}
            color={saved ? C.price : C.ink}
            onPress={() =>
              guarded(() =>
                toggleSaved.mutate(
                  { id: l.id, saved: !saved },
                  { onError: (e) => toast(e.message) },
                ),
              )
            }
          />
          <IconButton
            variant="float"
            icon="share"
            label="Chia sẻ"
            onPress={() => void Share.share({ message: `${l.title} – ${formatVnd(l.price)}` })}
          />
          <IconButton
            variant="float"
            icon="flag"
            label="Báo cáo tin"
            onPress={() => guarded(() => setReporting(true))}
          />
        </View>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + S.md }]}>
        <IconButton
          variant="outline"
          icon="phone"
          label="Gọi người bán"
          onPress={() =>
            l.seller.phone
              ? void Linking.openURL(`tel:${l.seller.phone}`)
              : toast('Người bán chưa thêm số điện thoại')
          }
        />
        {l.allowOffers && !l.ended && (
          <View style={styles.flex}>
            <OutlineButton label="Trả giá" onPress={() => chat(true)} />
          </View>
        )}
        <View style={styles.flexWide}>
          <PinButton
            label="Chat ngay"
            icon="message-circle"
            loading={openChat.isPending}
            onPress={() => chat(false)}
          />
        </View>
      </View>

      <ReportSheet
        visible={reporting}
        title="Báo cáo tin này vì…"
        onClose={() => setReporting(false)}
        onSelect={(category) =>
          report.mutate(
            { id: l.id, category },
            {
              onSuccess: () => toast('Đã gửi báo cáo, đội kiểm duyệt sẽ xem xét'),
              onError: (e) => toast(e.message),
            },
          )
        }
      />
      <ConfirmSheet
        visible={unbadging && l.badge !== null}
        title={`Gỡ huy hiệu ${l.badge?.name ?? ''}?`}
        confirmLabel="Gỡ huy hiệu"
        note="Tin vẫn hiển thị; người đăng không gắn lại huy hiệu nhóm này lên tin này được nữa"
        onClose={() => setUnbadging(false)}
        onConfirm={() =>
          l.badge &&
          removeBadge.mutate(
            { groupId: l.badge.groupId, listingId: l.id },
            { onSuccess: () => toast('Đã gỡ huy hiệu nhóm'), onError: (e) => toast(e.message) },
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paperWarm },
  // Thẻ nội dung trồi lên đè mép dưới gallery 20px, như tấm giấy kéo lên từ dưới ảnh.
  sheet: {
    marginTop: -20,
    paddingTop: 18,
    paddingHorizontal: S.lg,
    paddingBottom: S.xl,
    gap: 18,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    backgroundColor: C.paperWarm,
  },
  topBar: {
    position: 'absolute',
    left: S.lg,
    right: S.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topActions: { flexDirection: 'row', gap: S.sm },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: S.md,
    paddingHorizontal: S.lg,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: C.paperWarm,
  },
  flex: { flex: 1 },
  flexWide: { flex: 1.4 },
});
