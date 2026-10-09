import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Avatar, Verified } from './Avatar';
import { DEFAULT_CITY } from '@/api/client';
import { useHasUnreadNotices, useMe } from '@/queries/account';
import { useMyGroups } from '@/queries/groups';
import { useReadiness } from '@/queries/health';
import { useIsAuthenticated } from '@/stores/auth';
import { C, F, G, R, S } from '@/theme';

/** Header xanh của trang chủ: lời chào, ô tìm kiếm, nhóm của tôi. Khách thấy lời mời đăng nhập thay tên. */
export function HomeHero() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authed = useIsAuthenticated();
  const me = useMe();
  const groups = useMyGroups();
  const hasNotice = useHasUnreadNotices();
  const name = me.data?.name;

  return (
    <View style={[styles.hero, { paddingTop: insets.top + S.lg }]}>
      {/* `radial-gradient(140% 100% at 100% 0%)` của bản gốc: tâm góc trên phải, bán kính theo khung. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="hero" cx="1" cy="0" rx="1.4" ry="1" fx="1" fy="0">
            <Stop offset="0" stopColor={G.hero[0]} />
            <Stop offset="0.5" stopColor={G.hero[1]} />
            <Stop offset="1" stopColor={G.hero[2]} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#hero)" />
      </Svg>

      <View style={styles.row}>
        <Avatar name={name ?? 'G'} size={44} tone="brand" />
        <Pressable style={styles.greeting} disabled={authed} onPress={() => router.push('/login')}>
          <Text style={styles.hello}>Xin chào,</Text>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {authed ? (name ?? ' ') : 'Đăng nhập để bắt đầu'}
            </Text>
            {me.data?.verified && <Verified size={16} />}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thông báo"
          onPress={() => router.navigate('/(tabs)/notifications')}
          style={styles.bell}
        >
          <Feather name="bell" size={22} color={C.paperWarm} />
          {hasNotice && <View style={styles.bellDot} />}
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="search"
        onPress={() => router.push('/search')}
        style={styles.search}
      >
        <Feather name="search" size={20} color={C.ink} />
        <Text style={styles.searchText}>Bạn muốn tìm gì hôm nay?</Text>
        <View style={styles.city}>
          <Feather name="map-pin" size={14} color={C.brand} />
          <Text style={styles.cityText}>{me.data?.place.city ?? DEFAULT_CITY}</Text>
        </View>
      </Pressable>

      {groups.data && groups.data.length > 0 && (
        <View style={styles.groups}>
          <Text style={styles.groupsTitle}>Nhóm của bạn</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.groupRow}>
              {groups.data.map((g) => (
                <Pressable
                  key={g.id}
                  accessibilityRole="link"
                  onPress={() => router.push(`/group/${g.id}`)}
                  style={styles.groupChip}
                >
                  <View style={styles.groupBadge}>
                    <Text style={styles.groupInitials}>{g.initials}</Text>
                  </View>
                  <Text style={styles.groupName}>{g.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
      {__DEV__ && <DevStatus />}
    </View>
  );
}

/**
 * Chỉ bản dev: nhắc rằng tin trên màn là dữ liệu mẫu, và đèn readiness (app → SDK → backend → Postgres)
 * vẫn chạy để biết đường ống thật đã thông trước khi đổi `mockApi` sang `api`.
 */
function DevStatus() {
  const readiness = useReadiness();
  const color = readiness.isError
    ? C.pin
    : readiness.data?.database === 'up'
      ? C.brandBright
      : C.amber;
  return (
    <View style={styles.dev}>
      <View style={[styles.devDot, { backgroundColor: color }]} />
      <Text style={styles.devText}>Dữ liệu mẫu · đèn = backend</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: S.lg,
    paddingBottom: S.xl - 4,
    gap: S.lg,
    borderBottomLeftRadius: R.xl,
    borderBottomRightRadius: R.xl,
    overflow: 'hidden',
    backgroundColor: C.brandDark,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  greeting: { flex: 1, gap: 2 },
  hello: { fontFamily: F.ui, fontSize: 13, color: C.brandLine },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: F.uiBold, fontSize: 17, color: C.paperWarm },
  bell: {
    width: 44,
    height: 44,
    borderRadius: R.sm,
    backgroundColor: C.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 9,
    height: 9,
    borderRadius: R.full,
    borderWidth: 2,
    borderColor: C.brandDark,
    backgroundColor: C.dot,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingLeft: S.lg,
    paddingRight: S.sm,
    borderRadius: R.md,
    backgroundColor: C.paperWarm,
  },
  searchText: { flex: 1, fontFamily: F.ui, fontSize: 15, color: C.muted },
  city: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: R.sm,
    backgroundColor: C.sand,
  },
  cityText: { fontFamily: F.uiSemi, fontSize: 13, color: C.ink },
  groups: { gap: S.sm },
  groupsTitle: { fontFamily: F.uiSemi, fontSize: 12, color: C.brandLine },
  groupRow: { flexDirection: 'row', gap: S.sm },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingLeft: S.xs,
    paddingRight: S.md,
    borderRadius: R.full,
    backgroundColor: C.glass,
  },
  groupBadge: {
    width: 26,
    height: 26,
    borderRadius: R.full,
    backgroundColor: C.brandLt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInitials: { fontFamily: F.uiBold, fontSize: 11, color: C.brandDark },
  groupName: { fontFamily: F.uiMedium, fontSize: 13, color: C.paperWarm },
  dev: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -S.sm },
  devDot: { width: 8, height: 8, borderRadius: R.full },
  devText: { fontFamily: F.ui, fontSize: 11, color: C.brandLine },
});
