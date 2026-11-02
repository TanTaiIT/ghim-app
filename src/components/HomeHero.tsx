import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop, SvgXml } from 'react-native-svg';
import { Avatar, Verified } from './Avatar';
import { useMe } from '@/queries/account';
import { useProvinces } from '@/queries/catalog';
import { useHomeFilters } from '@/queries/listings';
import { useMyGroups } from '@/queries/groups';
import { useReadiness } from '@/queries/health';
import { useMyWallet } from '@/queries/wallet';
import { useIsAuthenticated } from '@/stores/auth';
import { C, F, G, R, S } from '@/theme';
import { toSearchParams } from '@/utils/search-params';

/**
 * Header teal của trang chủ (theme theo ảnh mẫu Travelin, 02/11/2026): lời chào kèm số Xu, avatar, khẩu hiệu giữa
 * tranh đồ cũ, ô tìm kiếm, nhóm của tôi; đáy có hai vệt sóng sáng. Không còn nút chuông — tab Thông báo đã có chấm báo mới. Khách thấy lời mời
 * đăng nhập thay tên và không có dòng Xu.
 */
export function HomeHero() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authed = useIsAuthenticated();
  const me = useMe();
  const wallet = useMyWallet();
  const filters = useHomeFilters();
  const provinces = useProvinces();
  const groups = useMyGroups();
  const name = me.data?.name;

  return (
    <View style={[styles.hero, { paddingTop: insets.top + S.lg }]}>
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
      <View pointerEvents="none" style={[styles.wave, styles.waveLeft]} />
      <View pointerEvents="none" style={[styles.wave, styles.waveRight]} />
      <View
        pointerEvents="none"
        style={[styles.art, { top: insets.top + S.lg - ART.padTop + ART.rowShift }]}
      >
        <SvgXml xml={HERO_ART} width={ART.width} height={ART.height} />
      </View>

      <View style={styles.row}>
        <Pressable style={styles.greeting} disabled={authed} onPress={() => router.push('/login')}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {authed ? `Xin chào, ${name ?? ''}` : 'Xin chào!'}
            </Text>
            {me.data?.verified && <Verified size={18} />}
          </View>
          {authed ? (
            <View style={styles.xuRow}>
              <Feather name="disc" size={16} color={C.amber} />
              <Text style={styles.xu}>
                {wallet.data === undefined ? 'Ví Xu' : `${wallet.data} Xu`}
              </Text>
            </View>
          ) : (
            <Text style={styles.hello}>Đăng nhập để mua bán gần nhà</Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cá nhân"
          onPress={() => router.navigate('/(tabs)/profile')}
          style={styles.avatarRing}
        >
          <Avatar name={name ?? 'G'} size={52} tone="brand" uri={me.data?.avatarUrl} />
        </Pressable>
      </View>

      <View style={styles.slogan}>
        <Text style={styles.sloganText}>{'Đồ cũ còn tốt,\nmua bán gần nhà'}</Text>
      </View>

      <Pressable
        accessibilityRole="search"
        onPress={() => router.push({ pathname: '/search', params: toSearchParams(filters) })}
        style={styles.search}
      >
        <Feather name="search" size={20} color={C.muted} />
        <Text style={styles.searchText}>Bạn muốn tìm gì hôm nay?</Text>
        <View style={styles.city}>
          <Feather name="map-pin" size={14} color={C.brand} />
          <Text style={styles.cityText}>
            {provinces.data?.find((p) => p.code === filters.provinceCode)?.name ?? 'Toàn quốc'}
          </Text>
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
 * Chỉ bản dev: đèn readiness (app → SDK → backend → Postgres) — bảng tin trống mà đèn đỏ là server chưa chạy, không
 * phải sàn không có tin.
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
      <Text style={styles.devText}>Đèn = backend</Text>
    </View>
  );
}

/**
 * Tranh port nguyên từ bộ UI. Mã màu là điểm ảnh của tranh, không phải màu giao diện, nên không thuộc `@/theme`.
 * Tranh vẽ cho khung rộng 390, đệm trên 52, hàng chào cao 44; dời theo đệm thật (safe-area) và `rowShift` (hàng chào
 * tên lớn + dòng Xu cao hơn) để ghế không đè dòng Xu mà vẫn đứng cạnh khẩu hiệu. Quầng sáng và bóng đổi từ tông xanh
 * lá sang teal khi app chuyển theme (02/11/2026).
 */
const ART = { width: 390, height: 382, padTop: 52, rowShift: 18 };

const HERO_ART = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 382">
  <defs>
    <filter id="hdrShadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#012F36" flood-opacity="0.38"/>
    </filter>
    <radialGradient id="hdrGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#7DD3DC" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#7DD3DC" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hdrChair" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FDBA4D"/><stop offset="1" stop-color="#E07B0A"/></linearGradient>
    <linearGradient id="hdrScreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A78BFA"/><stop offset="1" stop-color="#F472B6"/></linearGradient>
    <linearGradient id="hdrFan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0F9FF"/><stop offset="1" stop-color="#BAE6FD"/></linearGradient>
    <linearGradient id="hdrShoe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FDA4AF"/><stop offset="1" stop-color="#E11D48"/></linearGradient>
    <linearGradient id="hdrPot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FB923C"/><stop offset="1" stop-color="#C2410C"/></linearGradient>
    <g id="hdrCoin">
      <circle r="10" fill="#D97706"/>
      <circle r="9" cy="-1" fill="#FCD34D"/>
      <circle r="6" cy="-1" fill="none" stroke="#F59E0B" stroke-width="1.5"/>
      <text y="2.6" text-anchor="middle" font-size="9" font-family="${F.uiBlack}" fill="#B45309">đ</text>
    </g>
    <path id="hdrSpark" fill="#FEF3C7" d="M0 -6 C0.8 -1.2 1.2 -0.8 6 0 C1.2 0.8 0.8 1.2 0 6 C-0.8 1.2 -1.2 0.8 -6 0 C-1.2 -0.8 -0.8 -1.2 0 -6z"/>
  </defs>

  <ellipse cx="195" cy="166" rx="150" ry="74" fill="url(#hdrGlow)"/>
  <g opacity="0.75">
    <use href="#hdrSpark" transform="translate(112 112) scale(0.8)"/>
    <use href="#hdrSpark" transform="translate(292 214) scale(0.7)"/>
    <use href="#hdrSpark" transform="translate(206 30) scale(0.6)"/>
    <use href="#hdrSpark" transform="translate(30 104) scale(0.55)"/>
  </g>

  <g filter="url(#hdrShadow)">
    <g transform="translate(14 -2) rotate(-6)">
      <path d="M20 26 C8 22 2 10 6 2 C14 6 20 14 20 26z" fill="#BEF264"/>
      <path d="M22 26 C24 12 34 4 44 6 C42 18 34 26 22 26z" fill="#A3E635"/>
      <path d="M21 26 C18 16 20 6 26 -2 C30 8 28 18 21 26z" fill="#D9F99D"/>
      <path d="M8 26 H36 L32 46 Q31 50 27 50 H17 Q13 50 12 46z" fill="url(#hdrPot)"/>
      <rect x="6" y="24" width="32" height="7" rx="3" fill="#FDBA74"/>
    </g>
    <g transform="translate(236 -10) rotate(9)">
      <rect x="6" y="-4" width="12" height="7" rx="2" fill="#94A3B8"/>
      <rect x="40" y="-3" width="8" height="5" rx="2" fill="#E11D48"/>
      <rect x="0" y="0" width="58" height="38" rx="8" fill="#FEF3C7"/>
      <rect x="0" y="11" width="58" height="19" fill="#334155"/>
      <circle cx="29" cy="20" r="14" fill="#E2E8F0"/>
      <circle cx="29" cy="20" r="10.5" fill="#0F172A"/>
      <circle cx="29" cy="20" r="6.5" fill="#475569"/>
      <circle cx="26" cy="17" r="2.4" fill="#FFFFFF" opacity="0.7"/>
      <rect x="45" y="4" width="8" height="5" rx="1.5" fill="#BAE6FD"/>
    </g>
    <g transform="translate(350 -16) rotate(14)">
      <rect x="20" y="22" width="5" height="26" rx="2" fill="#E2E8F0"/>
      <ellipse cx="22" cy="49" rx="14" ry="4.5" fill="#CBD5E1"/>
      <path d="M8 2 H36 L44 24 H0z" fill="#FDE68A"/>
      <path d="M8 2 H18 L12 24 H0z" fill="#FFFFFF" opacity="0.35"/>
    </g>
    <g transform="translate(2 118) rotate(-9) scale(0.88)">
      <rect x="16" y="0" width="68" height="52" rx="18" fill="url(#hdrChair)"/>
      <path d="M24 8 Q34 4 46 6" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
      <circle cx="38" cy="24" r="2.2" fill="#B45309"/>
      <circle cx="62" cy="24" r="2.2" fill="#B45309"/>
      <rect x="10" y="44" width="80" height="22" rx="10" fill="#FCD34D"/>
      <rect x="0" y="32" width="22" height="38" rx="11" fill="#F59E0B"/>
      <rect x="78" y="32" width="22" height="38" rx="11" fill="#F59E0B"/>
      <rect x="16" y="68" width="7" height="14" rx="3" fill="#78350F"/>
      <rect x="77" y="68" width="7" height="14" rx="3" fill="#78350F"/>
    </g>
    <g transform="translate(306 106) rotate(8) scale(0.92)">
      <ellipse cx="40" cy="98" rx="28" ry="7" fill="#94A3B8"/>
      <ellipse cx="40" cy="95" rx="28" ry="7" fill="#E2E8F0"/>
      <rect x="35" y="56" width="10" height="40" rx="4" fill="#CBD5E1"/>
      <circle cx="40" cy="38" r="37" fill="url(#hdrFan)"/>
      <g fill="#38BDF8">
        <ellipse cx="40" cy="20" rx="9" ry="17"/>
        <ellipse cx="40" cy="20" rx="9" ry="17" transform="rotate(120 40 38)"/>
        <ellipse cx="40" cy="20" rx="9" ry="17" transform="rotate(240 40 38)"/>
      </g>
      <circle cx="40" cy="38" r="8" fill="#0284C7"/>
      <circle cx="40" cy="38" r="37" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>
      <circle cx="40" cy="38" r="26" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.7"/>
      <path d="M14 18 Q22 8 34 5" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
    </g>
    <g transform="translate(-6 202) rotate(-14)">
      <path d="M8 28 C6 12 18 4 32 6 L46 16 C60 18 76 20 86 26 C92 30 92 36 86 38 L10 38z" fill="url(#hdrShoe)"/>
      <path d="M36 14 L42 10 M42 20 L49 16 M50 22 L57 18" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
      <path d="M24 30 Q48 18 74 30" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
      <rect x="4" y="36" width="88" height="10" rx="5" fill="#FFFFFF"/>
      <rect x="4" y="42" width="88" height="4" rx="2" fill="#FDE68A"/>
    </g>
    <g transform="translate(330 176) rotate(18)">
      <rect x="0" y="0" width="40" height="76" rx="10" fill="#1E293B"/>
      <rect x="3" y="3" width="34" height="70" rx="8" fill="url(#hdrScreen)"/>
      <rect x="14" y="7" width="12" height="4" rx="2" fill="#1E293B"/>
      <path d="M3 40 L37 22 V34 L3 52z" fill="#FFFFFF" opacity="0.22"/>
    </g>
    <use href="#hdrCoin" transform="translate(84 30) rotate(-18)"/>
    <use href="#hdrCoin" transform="translate(100 210) rotate(12) scale(0.8)"/>
    <use href="#hdrCoin" transform="translate(286 124) rotate(20) scale(0.75)"/>
  </g>
</svg>`;

const WAVE = 360;

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: S.lg,
    paddingBottom: S.xxl,
    gap: S.lg + 4,
    borderBottomLeftRadius: R.xl,
    borderBottomRightRadius: R.xl,
    overflow: 'hidden',
    backgroundColor: C.brand,
  },
  wave: {
    position: 'absolute',
    width: WAVE,
    height: WAVE,
    borderRadius: WAVE / 2,
    backgroundColor: C.brandWave,
  },
  waveLeft: { left: -WAVE / 3, bottom: -WAVE * 0.78, opacity: 0.55 },
  waveRight: { right: -WAVE / 2.4, bottom: -WAVE * 0.72, opacity: 0.35 },
  art: {
    position: 'absolute',
    left: '50%',
    marginLeft: -ART.width / 2,
    width: ART.width,
    height: ART.height,
  },
  slogan: { height: 108, alignItems: 'center', justifyContent: 'center' },
  sloganText: {
    fontFamily: F.uiBlack,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
    textAlign: 'center',
    color: C.paperWarm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, zIndex: 1 },
  greeting: { flex: 1, gap: S.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: F.uiBlack, fontSize: 26, color: C.paperWarm },
  hello: { fontFamily: F.ui, fontSize: 14, color: C.brandLine },
  xuRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  xu: { fontFamily: F.uiSemi, fontSize: 15, color: C.amber },
  avatarRing: { padding: 3, borderRadius: R.full, backgroundColor: C.paperWarm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 54,
    paddingLeft: S.lg,
    paddingRight: S.sm,
    borderRadius: R.sm,
    backgroundColor: C.paperWarm,
  },
  searchText: { flex: 1, fontFamily: F.ui, fontSize: 16, color: C.muted },
  city: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: R.sm,
    backgroundColor: C.brandWash,
  },
  cityText: { fontFamily: F.uiSemi, fontSize: 13, color: C.brandDark },
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
