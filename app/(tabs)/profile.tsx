import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MyListing, MyListingAction } from '@/api/client';
import { GuestGate } from '@/components/GuestGate';
import { ListingRow } from '@/components/ListingCard';
import { MyListingActionSheet, MyListingCard } from '@/components/MyListingCard';
import { ProfileHeader } from '@/components/ProfileHeader';
import { SegmentedTabs } from '@/components/TabStrip';
import { useToast } from '@/components/Toast';
import { EmptyState, GhostButton, Loading, type IconName } from '@/components/ui';
import { useMe, useSetShowActivity } from '@/queries/account';
import { useSignOut } from '@/queries/auth';
import { useSavedListings } from '@/queries/listings';
import { useOpenForEdit } from '@/queries/posting';
import { useMarkSold, useMyListingAction, useMyListings } from '@/queries/selling';
import { useIsAuthenticated } from '@/stores/auth';
import { C, F, R, S } from '@/theme';

type Shelf = 'active' | 'sold' | 'saved';

/** Gia hạn và chuyển lên chợ chung đi qua máy duyệt: tin chưa hiện ngay, nên câu báo nói rõ là đang kiểm. */
const DONE: Record<MyListingAction, string> = {
  withdraw: 'Đã rút tin về nháp',
  renew: 'Đã gửi gia hạn, tin đang được kiểm tra',
  move: 'Đã gửi tin lên chợ chung, tin đang được kiểm tra',
  delete: 'Đã xoá tin',
};

export default function Profile() {
  const router = useRouter();
  const toast = useToast();
  const authed = useIsAuthenticated();
  const signOut = useSignOut();
  const [shelf, setShelf] = useState<Shelf>('active');

  const me = useMe();
  const showActivity = useSetShowActivity();
  const active = useMyListings('active');
  const sold = useMyListings('sold');
  const saved = useSavedListings();
  const markSold = useMarkSold();
  const act = useMyListingAction();
  const [acting, setActing] = useState<MyListing | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const run = (action: MyListingAction, item: MyListing) =>
    act.mutate(
      { action, item },
      { onSuccess: () => toast(DONE[action]), onError: (e) => toast(e.message) },
    );
  const openForEdit = useOpenForEdit();
  /** Nháp thì làm tiếp, tin đang hiển thị thì sửa — cùng một luồng, form nạp sẵn từ server. */
  const openEditor = (id: string) =>
    void openForEdit(id)
      .then(() => router.push({ pathname: '/post', params: { edit: '1' } }))
      .catch((e: Error) => toast(e.message));

  if (!authed) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Text style={styles.guestTitle}>Cá nhân</Text>
        <GuestGate text="Đăng nhập để đăng tin, lưu tin và nhắn với người bán." />
      </SafeAreaView>
    );
  }
  if (me.isPending) return <Loading />;
  if (me.isError) return <EmptyState icon="wifi-off" text={me.error.message} />;

  // Server không trả tổng số tin: đếm từ chính các danh sách đang hiện.
  const stats = {
    active: active.data?.length ?? 0,
    sold: sold.data?.length ?? 0,
    saved: saved.data?.length ?? 0,
  };
  const menu: { icon: IconName; label: string; onPress: () => void }[] = [
    {
      icon: 'check-circle',
      label: 'Xác minh tài khoản',
      onPress: () =>
        toast(
          me.data.idVerified ? 'Tài khoản đã xác minh CCCD' : 'Xác minh giấy tờ sẽ có ở bản sau',
        ),
    },
    {
      icon: 'users',
      label: 'Nhóm của tôi',
      onPress: () => router.push('/groups'),
    },
    { icon: 'help-circle', label: 'Trợ giúp & hỗ trợ', onPress: () => router.push('/help') },
    {
      icon: 'activity',
      label: `Hiện trạng thái hoạt động: ${me.data.showActivity ? 'Bật' : 'Tắt'}`,
      onPress: () =>
        showActivity.mutate(!me.data.showActivity, { onError: (e) => toast(e.message) }),
    },
  ];
  const mine = shelf === 'sold' ? sold : active;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView>
        <ProfileHeader
          me={me.data}
          active={stats.active}
          sold={stats.sold}
          onSettings={() => toast('Cài đặt sẽ có ở bản sau')}
        />

        <View style={styles.main}>
          <SegmentedTabs
            value={shelf}
            onChange={setShelf}
            tabs={[
              { id: 'active', label: `Đang đăng (${stats.active})` },
              { id: 'sold', label: `Đã bán (${stats.sold})` },
              { id: 'saved', label: `Đã lưu (${stats.saved})` },
            ]}
          />

          {shelf === 'saved' ? (
            saved.isPending ? (
              <Loading />
            ) : saved.data?.length ? (
              saved.data.map((l) => (
                <ListingRow key={l.id} item={l} onPress={() => router.push(`/listing/${l.id}`)} />
              ))
            ) : (
              <EmptyState icon="heart" text="Chưa lưu tin nào. Bấm trái tim trên tin để lưu." />
            )
          ) : mine.isPending ? (
            <Loading />
          ) : mine.data?.length ? (
            mine.data.map((l) => (
              <MyListingCard
                key={l.id}
                item={l}
                onPress={() =>
                  l.state === 'draft' ? openEditor(l.id) : router.push(`/listing/${l.id}`)
                }
                onEdit={() => openEditor(l.id)}
                onBoost={() => toast('Đẩy tin sẽ có khi chốt giá gói')}
                onSold={() =>
                  markSold.mutate(l.id, {
                    onSuccess: () => toast('Đã chuyển tin sang mục Đã bán'),
                    onError: (e) => toast(e.message),
                  })
                }
                onMore={() => setActing(l)}
                confirmDelete={
                  deleting === l.id
                    ? {
                        onConfirm: () => {
                          setDeleting(null);
                          run('delete', l);
                        },
                        onCancel: () => setDeleting(null),
                      }
                    : null
                }
              />
            ))
          ) : (
            <EmptyState icon="package" text="Chưa có tin nào ở mục này." />
          )}

          <View style={styles.menu}>
            {menu.map((m, i) => (
              <Pressable
                key={m.label}
                accessibilityRole="link"
                onPress={m.onPress}
                style={[styles.menuItem, i < menu.length - 1 && styles.menuLine]}
              >
                <View style={styles.menuIcon}>
                  <Feather name={m.icon} size={17} color={C.brand} />
                </View>
                <Text style={styles.menuLabel}>{m.label}</Text>
                <Feather name="chevron-right" size={16} color={C.muted} />
              </Pressable>
            ))}
          </View>
          <GhostButton
            label="Đăng xuất"
            onPress={() => signOut.mutate(undefined, { onError: (e) => toast(e.message) })}
          />
        </View>
      </ScrollView>
      <MyListingActionSheet
        item={acting}
        onClose={() => setActing(null)}
        onSelect={(action) => {
          if (!acting) return;
          if (action === 'delete') setDeleting(acting.id);
          else run(action, acting);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  guestTitle: { padding: S.lg, fontFamily: F.uiBlack, fontSize: 24, color: C.ink },
  main: { padding: S.lg, gap: S.md },
  menu: {
    marginTop: S.xs,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paperWarm,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  menuLine: { borderBottomWidth: 1, borderBottomColor: C.line },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    backgroundColor: C.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontFamily: F.uiMedium, fontSize: 14, color: C.ink },
});
