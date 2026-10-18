import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { useCategories } from '@/queries/catalog';
import { C, F, S } from '@/theme';

const ICON = 60;

const grad = (id: string, from: string, to: string, down = false) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${down ? 0 : 1}" y2="1">` +
  `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;

function frame(body: string, defs = ''): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${defs}</defs>` +
    `<ellipse cx="32" cy="58" rx="20" ry="3" fill="#0F172A" opacity="0.10"/>${body}</svg>`
  );
}

/**
 * Tranh của bảy ô danh mục trong thiết kế, tra theo TÊN danh mục: server dùng uuid do master tạo lúc chạy,
 * không có khoá cố định nào khác để gắn tranh. Danh mục không có ô vẫn tìm được qua "Tất cả".
 * Mã màu trong tranh là điểm ảnh, không phải màu giao diện — không thuộc `@/theme` (cùng lý do với
 * `@/api/mock-art`). Mỗi tranh giữ id gradient riêng: trên web mọi `<svg>` inline chung một không gian
 * id, trùng tên thì ô sau tô bằng gradient của ô trước.
 */
const ART: { name: string; art: string }[] = [
  {
    name: 'Điện thoại',
    art: frame(
      `<g transform="rotate(-9 32 32)">
        <rect x="45.5" y="17" width="2" height="8" rx="1" fill="#475569"/>
        <rect x="18" y="5" width="28" height="51" rx="7" fill="#1E293B"/>
        <rect x="20.5" y="7.5" width="23" height="46" rx="5" fill="url(#ciPh)"/>
        <rect x="28" y="9.5" width="8" height="3" rx="1.5" fill="#1E293B"/>
        <rect x="23.5" y="17" width="5" height="5" rx="1.5" fill="#FDE68A"/>
        <rect x="29.5" y="17" width="5" height="5" rx="1.5" fill="#FFFFFF"/>
        <rect x="35.5" y="17" width="5" height="5" rx="1.5" fill="#FCA5A5"/>
        <rect x="23.5" y="24" width="5" height="5" rx="1.5" fill="#86EFAC"/>
        <rect x="29.5" y="24" width="5" height="5" rx="1.5" fill="#FDBA74"/>
        <rect x="35.5" y="24" width="5" height="5" rx="1.5" fill="#FFFFFF" opacity="0.8"/>
        <rect x="24" y="47" width="16" height="2" rx="1" fill="#FFFFFF" opacity="0.7"/>
        <path d="M20.5 36 L43.5 24 V32 L20.5 44z" fill="#FFFFFF" opacity="0.18"/>
      </g>`,
      grad('ciPh', '#60A5FA', '#8B5CF6'),
    ),
  },
  {
    name: 'Laptop',
    art: frame(
      `<rect x="12" y="11" width="40" height="31" rx="3.5" fill="#334155"/>
      <rect x="14.5" y="13.5" width="35" height="26" rx="1.5" fill="url(#ciLpS)"/>
      <path d="M14.5 32 C24 25 32 35 49.5 27 V39.5 H14.5z" fill="#FFFFFF" opacity="0.22"/>
      <rect x="18" y="17" width="12" height="2.5" rx="1.2" fill="#FFFFFF" opacity="0.8"/>
      <rect x="18" y="21.5" width="8" height="2" rx="1" fill="#FFFFFF" opacity="0.55"/>
      <path d="M6 43 H58 L61.5 50 Q62 53 59 53 H5 Q2 53 2.5 50z" fill="url(#ciLpB)"/>
      <rect x="26" y="43" width="12" height="2.6" rx="1.3" fill="#64748B"/>
      <path d="M6 43 H58" stroke="#FFFFFF" stroke-width="1.2" opacity="0.8"/>`,
      grad('ciLpS', '#34D399', '#0EA5E9') + grad('ciLpB', '#F1F5F9', '#94A3B8', true),
    ),
  },
  {
    name: 'Thời trang',
    art: frame(
      `<path d="M29.5 7.5 a2.6 2.6 0 1 1 2.5 3.2 v3" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
      <path d="M14 21.5 L32 13.5 L50 21.5" fill="none" stroke="#94A3B8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 18 L12 23 L7.5 33.5 L15.5 37 L18 32.5 V53 Q18 56 21 56 H43 Q46 56 46 53 V32.5 L48.5 37 L56.5 33.5 L52 23 L42 18 Q38 23.5 32 23.5 Q26 23.5 22 18z" fill="url(#ciTe)"/>
      <path d="M22 18 Q32 29 42 18" fill="none" stroke="#9F1239" stroke-width="2" stroke-linecap="round"/>
      <path d="M18 40 H46 M18 45 H46" stroke="#FFFFFF" stroke-width="2.4" opacity="0.55"/>
      <path d="M14 25 L10.5 32" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity="0.45"/>
      <path d="M21 26 V36" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity="0.35"/>`,
      grad('ciTe', '#FB7185', '#E11D48'),
    ),
  },
  {
    name: 'Nội thất',
    art: frame(
      `<rect x="10" y="15" width="44" height="23" rx="8" fill="url(#ciSo)"/>
      <rect x="14" y="18.5" width="17" height="16" rx="5" fill="#FCD34D"/>
      <rect x="33" y="18.5" width="17" height="16" rx="5" fill="#FCD34D"/>
      <path d="M16.5 22 Q21 20 25 21" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/>
      <rect x="17" y="26" width="10" height="9" rx="3" fill="#34D399" transform="rotate(-14 22 30)"/>
      <rect x="9" y="34" width="46" height="12" rx="5" fill="#FBBF24"/>
      <rect x="3.5" y="27" width="11.5" height="20.5" rx="5.7" fill="#F59E0B"/>
      <rect x="49" y="27" width="11.5" height="20.5" rx="5.7" fill="#F59E0B"/>
      <rect x="11" y="47" width="4" height="8" rx="1.5" fill="#78350F"/>
      <rect x="49" y="47" width="4" height="8" rx="1.5" fill="#78350F"/>`,
      grad('ciSo', '#FDBA4D', '#EA580C'),
    ),
  },
  {
    name: 'Xe cộ',
    art: frame(
      `<path d="M46 31 L50 48" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
      <circle cx="15" cy="48" r="8" fill="#1E293B"/><circle cx="15" cy="48" r="3.6" fill="#CBD5E1"/>
      <circle cx="50" cy="48" r="8" fill="#1E293B"/><circle cx="50" cy="48" r="3.6" fill="#CBD5E1"/>
      <path d="M6 44 C5 34 13 27 23 28 L35 29.5 L38 41 L43 43 V46 H9 Q6 46 6 44z" fill="url(#ciSc)"/>
      <path d="M35 29.5 L42 12 L47 13 L45.5 30 L47 41 L40 43z" fill="#2DD4BF"/>
      <path d="M40 44 A10 10 0 0 1 60 44" fill="none" stroke="#0F766E" stroke-width="3" stroke-linecap="round"/>
      <rect x="12" y="22.5" width="20" height="6" rx="3" fill="#7C2D12"/>
      <path d="M40 10 H52" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
      <circle cx="47.5" cy="16.5" r="3" fill="#FDE68A" stroke="#FFFFFF" stroke-width="1"/>
      <path d="M10 35 Q16 31 24 31" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>`,
      grad('ciSc', '#5EEAD4', '#0D9488'),
    ),
  },
  {
    name: 'Nhà đất',
    art: frame(
      `<rect x="40" y="10" width="6" height="14" rx="1" fill="#9A3412"/>
      <rect x="12" y="28" width="40" height="27" fill="#FEF3C7"/>
      <rect x="12" y="28" width="40" height="5" fill="#FDE68A"/>
      <path d="M5.5 30 L32 7.5 L58.5 30 Q60 33.5 56.5 33.5 H7.5 Q4 33.5 5.5 30z" fill="url(#ciHo)"/>
      <path d="M12 28 L32 11" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
      <rect x="27" y="39" width="10" height="16" rx="2" fill="#92400E"/>
      <circle cx="34.5" cy="47.5" r="1" fill="#FCD34D"/>
      <rect x="15.5" y="37" width="8" height="8" rx="1.5" fill="#7DD3FC" stroke="#FFFFFF" stroke-width="1.4"/>
      <rect x="40.5" y="37" width="8" height="8" rx="1.5" fill="#7DD3FC" stroke="#FFFFFF" stroke-width="1.4"/>
      <circle cx="10" cy="52" r="5" fill="#22C55E"/>
      <circle cx="15.5" cy="53" r="4" fill="#4ADE80"/>
      <circle cx="55" cy="53" r="4.2" fill="#22C55E"/>`,
      grad('ciHo', '#F87171', '#DC2626'),
    ),
  },
  {
    name: 'Việc làm',
    art: frame(
      `<path d="M24 19 V13 Q24 9.5 27.5 9.5 H36.5 Q40 9.5 40 13 V19" fill="none" stroke="#78350F" stroke-width="3.5"/>
      <rect x="7" y="18" width="50" height="35" rx="6" fill="url(#ciBg)"/>
      <path d="M7 31 H57" stroke="#78350F" stroke-width="1.6" opacity="0.55"/>
      <rect x="17" y="18" width="4" height="35" fill="#78350F" opacity="0.35"/>
      <rect x="43" y="18" width="4" height="35" fill="#78350F" opacity="0.35"/>
      <rect x="27.5" y="27" width="9" height="8" rx="1.8" fill="#FCD34D" stroke="#B45309" stroke-width="1.2"/>
      <rect x="11" y="21" width="22" height="3" rx="1.5" fill="#FFFFFF" opacity="0.3"/>`,
      grad('ciBg', '#E59A3A', '#92400E'),
    ),
  },
];

const ALL_ART = frame(
  `<rect x="9" y="11" width="22" height="22" rx="6" fill="#2563EB"/>
  <rect x="9" y="8" width="22" height="22" rx="6" fill="#60A5FA"/>
  <path d="M14 14 Q16 12 20 12.5" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.6"/>
  <rect x="33" y="11" width="22" height="22" rx="6" fill="#DB2777"/>
  <rect x="33" y="8" width="22" height="22" rx="6" fill="#F472B6"/>
  <path d="M38 14 Q40 12 44 12.5" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.6"/>
  <rect x="9" y="35" width="22" height="22" rx="6" fill="#D97706"/>
  <rect x="9" y="32" width="22" height="22" rx="6" fill="#FBBF24"/>
  <path d="M14 38 Q16 36 20 36.5" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.6"/>
  <rect x="33" y="35" width="22" height="22" rx="6" fill="#059669"/>
  <rect x="33" y="32" width="22" height="22" rx="6" fill="#34D399"/>
  <path d="M38 38 Q40 36 44 36.5" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.6"/>`,
);

/** Danh mục master tạo thêm mà bộ UI chưa vẽ tranh. */
const FALLBACK_ART = frame(
  `<path d="M10 22 L32 12 L54 22 V46 L32 56 L10 46z" fill="url(#ciBx)"/>
  <path d="M10 22 L32 32 L54 22 M32 32 V56" fill="none" stroke="#92400E" stroke-width="1.6" opacity="0.45"/>
  <path d="M21 17 L43 27 V35" fill="none" stroke="#FDE68A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  grad('ciBx', '#F5C77E', '#C2862F'),
);

/** Thiết kế: 7 ô danh mục + ô "Tất cả" = hai hàng bốn ô. */
const MAX_CELLS = 7;

const artIndex = (name: string) => {
  const i = ART.findIndex((a) => a.name === name);
  return i === -1 ? ART.length : i;
};

/**
 * Danh mục có tranh đứng trước theo thứ tự của thiết kế, danh mục lạ lấp chỗ trống bằng tranh mặc định —
 * master đổi tên một danh mục thì ô vẫn còn, chỉ mất tranh riêng.
 */
export function CategoryGrid() {
  const router = useRouter();
  const categories = useCategories();
  const cells = [...(categories.data ?? [])]
    .sort((a, b) => artIndex(a.name) - artIndex(b.name))
    .slice(0, MAX_CELLS);

  return (
    <View style={styles.grid}>
      {cells.map((c) => (
        <Tile
          key={c.id}
          label={c.name}
          art={ART.find((a) => a.name === c.name)?.art ?? FALLBACK_ART}
          onPress={() => router.push({ pathname: '/search', params: { category: c.id } })}
        />
      ))}
      <Tile label="Tất cả" art={ALL_ART} onPress={() => router.push('/search')} />
    </View>
  );
}

function Tile({ label, art, onPress }: { label: string; art: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.cell}
    >
      <SvgXml xml={art} width={ICON} height={ICON} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: S.md },
  cell: { width: '25%', alignItems: 'center', gap: S.xs },
  label: { fontFamily: F.uiMedium, fontSize: 12, color: C.ink },
});
