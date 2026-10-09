import { useState } from 'react';
import { FlatList, Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gallery } from '@/components/Gallery';
import { useGuarded } from '@/components/GuestGate';
import { ListingTile } from '@/components/ListingCard';
import { ListingSummary, ReportSheet, SellerCard, SpecGrid } from '@/components/ListingInfo';
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
import { useOpenConversation } from '@/queries/messages';
import { C, F, R, S } from '@/theme';
import { formatVnd } from '@/utils/format';

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const back = useBack();
  const toast = useToast();
  const guarded = useGuarded();
  const insets = useSafeAreaInsets();
  const [reporting, setReporting] = useState(false);

  const listing = useListing(id);
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
          <ListingSummary listing={l} />
          <SellerCard
            seller={l.seller}
            onOpen={() => toast('Trang người bán sẽ có khi nối backend')}
          />
          {l.specs.length > 0 && <SpecGrid specs={l.specs} />}
          {l.description !== '' && (
            <View style={styles.block}>
              <Text style={styles.h2}>Mô tả</Text>
              <Text style={styles.body}>{l.description}</Text>
            </View>
          )}
          <SafetyNote
            title="Giao dịch an toàn"
            text="Kiểm tra hàng trước khi thanh toán, không chuyển khoản đặt cọc cho người lạ. Admin không bao giờ yêu cầu chuyển khoản qua tin nhắn."
          />
          {similar.data && similar.data.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.h2}>Tin tương tự</Text>
              <FlatList
                horizontal
                data={similar.data}
                keyExtractor={(x) => x.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rail}
                renderItem={({ item }) => (
                  <ListingTile
                    item={item}
                    variant="mini"
                    onPress={() => router.push(`/listing/${item.id}`)}
                  />
                )}
              />
            </View>
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
        {l.allowOffers && (
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
        onClose={() => setReporting(false)}
        onSelect={(reason) =>
          report.mutate(
            { id: l.id, reason },
            {
              onSuccess: () => toast('Đã gửi báo cáo, đội kiểm duyệt sẽ xem xét'),
              onError: (e) => toast(e.message),
            },
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
  block: { gap: S.sm },
  h2: { fontFamily: F.uiBold, fontSize: 16, color: C.ink },
  body: { fontFamily: F.ui, fontSize: 14, lineHeight: 22, color: C.inkMid },
  rail: { gap: S.md },
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
