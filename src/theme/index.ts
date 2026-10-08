import { Platform } from 'react-native';

/**
 * Token là nguồn duy nhất của màu, chữ, bóng, bo góc, khoảng cách (HARD#8). Màu mới PHẢI thêm vào
 * đây trước khi dùng — hardcode hex tại call-site là cách palette vỡ dần mà không ai thấy.
 *
 * Giữ TÊN token của VueSer (`ink`, `paper`, `pin`, `brand`…) dù đây là app mới: người đọc đi qua
 * lại giữa hai repo không phải học hai bảng tên cho cùng một nghĩa. `pin` vẫn là màu cảnh báo (đỏ),
 * không phải màu thương hiệu; thương hiệu nằm ở nhóm `brand*`.
 */
export const C = {
  // ── Chữ ─────────────────────────────────────────────────────────
  ink: '#17181C',
  /** Chữ phụ, mô tả, meta. */
  inkSoft: '#6B7280',
  /** Chữ mờ nhất còn đọc được — nhãn, placeholder. */
  muted: '#A1A6AF',

  // ── Nền ─────────────────────────────────────────────────────────
  /** Nền màn hình. */
  paper: '#F1F2F4',
  /** Mặt thẻ, thanh nổi. */
  paperWarm: '#FFFFFF',
  /** Đường kẻ, viền ô nhập. */
  line: '#E4E6EA',
  /** Nền chip chưa chọn, ô nhập. */
  sand: '#F5F6F7',

  // ── Thương hiệu ─────────────────────────────────────────────────
  /** Nút chính, FAB, trạng thái đang chọn. */
  brand: '#3ECD7F',
  brandDark: '#2FB56D',
  /** Chặng đầu của nền hero — đủ sâu để chữ trắng đứng được; không dùng cho nút hay chữ. */
  brandDeep: '#137A52',
  /** Nền nhạt của thương hiệu — chip, ô đang chọn. */
  brandLt: '#E9F9F0',
  /** Chữ và biểu tượng thương hiệu trên nền sáng: `brand` quá nhạt để đọc. */
  brandTx: '#16A05B',

  // ── Trạng thái ──────────────────────────────────────────────────
  /** Cảnh báo, lỗi, nút huỷ: chấm chưa đọc, chữ "Xoá". */
  pin: '#E5484D',
  pinLight: '#FDECEC',
  /** Chờ xử lý, tin đang chờ người duyệt. */
  amber: '#F5B921',
  amberLight: '#FFF7E0',
  /** Thành công, đã bán. */
  moss: '#2F855A',
  mossLight: '#E6F4EA',
} as const;

/**
 * Tên font SAU KHI `useFonts` nạp xong ở `app/_layout.tsx`. Font mới: thêm vào `useFonts` VÀ vào đây
 * cùng lúc. Không dùng `fontWeight` để giả đậm — RN cần đúng family đã nạp.
 */
export const F = {
  ui: 'Manrope_500Medium',
  uiSemi: 'Manrope_600SemiBold',
  uiBold: 'Manrope_700Bold',
  uiBlack: 'Manrope_800ExtraBold',
} as const;

/** Bo góc — ba mức là đủ; cần mức thứ tư thì hỏi vì sao hai mức cạnh nhau không dùng được. */
export const R = { sm: 8, md: 12, lg: 20, full: 999 } as const;

/** Khoảng cách theo bội số 4. Số lẻ port từ CSS gốc vẫn được viết thẳng, nhưng không vào bảng này. */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/**
 * Đổ bóng cross-platform. `Platform.select` trả `T | undefined` dù nhánh `default` luôn có, nên `as
 * object` để spread vào `StyleSheet.create` không vỡ — đây là assertion duy nhất được chấp nhận
 * (typescript.convention §8), đừng nhân bản pattern này sang chỗ khác.
 */
export const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 3 },
}) as object;

export const shadowLift = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  default: { elevation: 8 },
}) as object;

/** Cặp màu cho `<LinearGradient>` — thay cho `linear-gradient` của web. */
export type Grad = readonly [string, string];

/**
 * Dải màu dùng chung. Ghép tay `colors={[C.a, C.b]}` tại call-site là cách sinh dải phẳng lúc palette
 * đổi. Chặng tắt dần là alpha-0 của chính màu đó, không `'transparent'` — Android nội suy qua sắc đen.
 */
export const G: Record<'brand' | 'hero', Grad> = {
  brand: [C.brandDeep, C.brand],
  hero: [C.brandDeep, '#1FA86B'],
};
