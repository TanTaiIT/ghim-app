import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GuestGate } from '@/components/GuestGate';
import { ListingRow } from '@/components/ListingCard';
import { MyListingCard } from '@/components/MyListingCard';
import { SegmentedTabs } from '@/components/TabStrip';
import { useToast } from '@/components/Toast';
import { Avatar, Verified } from '@/components/Avatar';
import { EmptyState, GhostButton, IconButton, Loading, type IconName } from '@/components/ui';
import { useMe } from '@/queries/account';
import { useSignOut } from '@/queries/auth';
import { useSavedListings } from '@/queries/listings';
import { useMarkSold, useMyListings } from '@/queries/selling';
import { useIsAuthenticated } from '@/stores/auth';
import { C, F, R, S } from '@/theme';

type Shelf = 'active' | 'sold' | 'saved';

export default function Profile() {
  const router = useRouter();
  const toast = useToast();
  const authed = useIsAuthenticated();
  const signOut = useSignOut();
  const [shelf, setShelf] = useState<Shelf>('active');

  const me = useMe();
  const active = useMyListings('active');
  const sold = useMyListings('sold');
  const saved = useSavedListings();
  const markSold = useMarkSold();

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

  const { stats } = me.data;
  const firstGroup = me.data.groups[0];
  const menu: { icon: IconName; label: string; onPress: () => void }[] = [
    {
      icon: 'check-circle',
      label: 'Xác minh tài khoản',
      onPress: () =>
        toast(
          me.data.idVerified
            ? 'Tài khoản đã xác minh CCCD'
            : 'Xác minh giấy tờ sẽ có khi backend mở add-identity',
        ),
    },
    {
      icon: 'users',
      label: 'Nhóm của tôi',
      onPress: () => firstGroup && router.push(`/group/${firstGroup.id}`),
    },
    { icon: 'help-circle', label: 'Trợ giúp & hỗ trợ', onPress: () => router.push('/help') },
    {
      icon: 'settings',
      label: 'Cài đặt ứng dụng',
      onPress: () => toast('Cài đặt sẽ có ở bản sau'),
    },
  ];
  const mine = shelf === 'sold' ? sold : active;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.idRow}>
            <Avatar name={me.data.name} size={68} tone="solid" />
            <View style={styles.id}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{me.data.name}</Text>
                {me.data.verified && <Verified size={17} />}
              </View>
              <Text style={styles.small}>
                {me.data.idVerified ? 'Đã xác minh CCCD · ' : ''}Thành viên từ {me.data.memberSince}
              </Text>
            </View>
            <IconButton
              variant="outline"
              icon="sliders"
              label="Cài đặt"
              onPress={() => toast('Cài đặt sẽ có ở bản sau')}
            />
          </View>
          <View style={styles.stats}>
            <Stat value={String(stats.active)} label="Đang đăng" />
            <Stat value={String(stats.sold)} label="Đã bán" />
            <Stat value={`${me.data.rating} ★`} label="Đánh giá" />
          </View>
        </View>

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
                onPress={() => router.push(`/listing/${l.id}`)}
                onEdit={() => toast('Sửa tin sẽ có khi backend mở add-listings')}
                onBoost={() => toast('Đẩy tin sẽ có khi chốt giá gói')}
                onSold={() =>
                  markSold.mutate(l.id, {
                    onSuccess: () => toast('Đã chuyển tin sang mục Đã bán'),
                    onError: (e) => toast(e.message),
                  })
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
          <GhostButton label="Đăng xuất" onPress={signOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.small}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  guestTitle: { padding: S.lg, fontFamily: F.uiBlack, fontSize: 24, color: C.ink },
  header: {
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
    paddingBottom: S.lg,
    gap: S.lg,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.paperWarm,
  },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  id: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: F.uiBlack, fontSize: 19, color: C.ink },
  small: { fontFamily: F.ui, fontSize: 12, color: C.inkSoft },
  stats: { flexDirection: 'row', gap: S.sm },
  stat: {
    flex: 1,
    padding: 10,
    gap: 2,
    alignItems: 'center',
    borderRadius: R.sm,
    backgroundColor: C.sand,
  },
  statValue: { fontFamily: F.uiBlack, fontSize: 18, color: C.ink },
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
