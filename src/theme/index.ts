import { Platform } from 'react-native';

/**
 * Token là nguồn duy nhất của màu, chữ, bóng, bo góc, khoảng cách (HARD#8). Màu mới PHẢI thêm vào
 * đây trước khi dùng — hardcode hex tại call-site là cách palette vỡ dần mà không ai thấy.
 *
 * Giá trị lấy từ bộ UI "Chợ Đồ Cũ – bản làm mới" (màn Hệ thống thiết kế). Giữ TÊN token của VueSer
 * (`ink`, `paper`, `pin`, `brand`…) dù giá trị đổi: người đọc đi qua lại giữa hai repo không phải học
 * hai bảng tên cho cùng một nghĩa. `pin` vẫn là màu lỗi (đỏ), không phải màu thương hiệu.
 */
export const C = {
  // ── Chữ ─────────────────────────────────────────────────────────
  ink: '#0F172A',
  /** Đoạn văn dài (mô tả, nội dung thông báo) — đậm hơn chữ phụ để đọc lâu không mỏi. */
  inkMid: '#334155',
  /** Chữ phụ, nhãn, chú thích. */
  inkSoft: '#475569',
  /** Meta (khu vực, thời gian), tab chưa chọn. */
  muted: '#64748B',
  /** Nền chờ ảnh, giá đã gạch, viền checkbox chưa chọn. */
  faint: '#94A3B8',

  // ── Nền ─────────────────────────────────────────────────────────
  /** Nền màn hình. */
  paper: '#F8FAFC',
  /** Mặt thẻ, thanh nổi. */
  paperWarm: '#FFFFFF',
  /** Đường kẻ, viền thẻ. */
  line: '#E2E8F0',
  /** Viền ô nhập, chip chưa chọn — `line` quá nhạt để thấy được ranh giới vùng chạm. */
  lineStrong: '#CBD5E1',
  /** Nền chip phụ, ô nhập, ô thông số. */
  sand: '#F1F5F9',

  // ── Thương hiệu (emerald) ───────────────────────────────────────
  /** Nút chính, liên kết, trạng thái đang chọn. */
  brand: '#047857',
  /** Header, chữ trên nền mint. */
  brandDark: '#065F46',
  /** Chặng cuối nền hero — đủ sâu để chữ trắng đứng được; không dùng cho nút hay chữ. */
  brandDeep: '#04503D',
  /** Chặng đầu nền hero (góc sáng). */
  brandHi: '#0B7A5C',
  /** Tích xanh, viền focus, thanh tiến trình. */
  brandBright: '#10B981',
  /** Nền chip đang chọn, nhãn trạng thái tốt. */
  brandLt: '#D1FAE5',
  /** Nền ô đang chọn lớn, thông báo chưa đọc — nhạt hơn `brandLt` để chữ thường vẫn đọc được. */
  brandWash: '#ECFDF5',
  /** Viền của khối `brandWash`; cũng là chữ phụ trên nền hero. */
  brandLine: '#A7F3D0',
  /** Chữ và biểu tượng thương hiệu trên nền sáng. */
  brandTx: '#047857',

  // ── Giá & đẩy tin (cam) ─────────────────────────────────────────
  /** Giá tiền, nút trả giá, badge đếm tin nhắn. */
  price: '#C2410C',
  /** Nền nhãn "Nổi bật", nút "Đẩy tin". */
  boost: '#FFEDD5',
  /** Chữ trên nền `boost`. */
  boostTx: '#9A3412',
  /** Chữ trong khối cảnh báo an toàn. */
  warnTx: '#7C2D12',
  warnWash: '#FFF7ED',
  warnLine: '#FED7AA',
  /** Viền thẻ đề xuất giá trong chat — đậm hơn `warnLine` vì thẻ cần nổi giữa các bong bóng. */
  offerLine: '#FDBA74',
  promoBg: '#FFF1E3',
  promoLine: '#FBD9B5',
  /** Chấm "có thông báo mới". */
  dot: '#F97316',

  // ── Trạng thái ──────────────────────────────────────────────────
  /** Lỗi, nút huỷ. */
  pin: '#E5484D',
  pinLight: '#FDECEC',
  /** Chờ xử lý, tin đang chờ người duyệt. */
  amber: '#F5B921',
  amberLight: '#FFF7E0',

  /** Lớp phủ tối (đếm ảnh trên gallery, nút xoá ảnh, nền sau bottom sheet). */
  scrim: 'rgba(15,23,42,0.72)',
  /** Nút kính trên nền ảnh/hero. */
  glass: 'rgba(255,255,255,0.14)',
} as const;

/**
 * Cặp nền/chữ cho ô tròn chữ cái (avatar) và ô danh mục. Avatar lấy tông theo băm tên — backend không
 * gửi màu; danh mục lấy theo bảng cố định ở `CategoryGrid`.
 */
export const TONE = {
  /** Avatar của chính người dùng, nhóm trên nền hero. */
  brand: { bg: C.brandLt, fg: C.brandDark },
  /** Avatar người bán / người chat ở cỡ lớn: nền thương hiệu đặc, chữ trắng. */
  solid: { bg: C.brand, fg: C.paperWarm },
  indigo: { bg: '#E0EAFF', fg: '#2952CC' },
  purple: { bg: '#EDE7FB', fg: '#6B3FD0' },
  pink: { bg: '#FDE4EC', fg: '#BE2457' },
  amber: { bg: '#FBEBD3', fg: '#9A5806' },
  teal: { bg: '#D6F0EC', fg: '#0F766E' },
  green: { bg: '#DDF3E4', fg: '#15803D' },
  navy: { bg: '#E3E8F7', fg: '#3445A8' },
  slate: { bg: '#F1F5F9', fg: '#0F172A' },
  blue: { bg: '#DBEAFE', fg: '#1E40AF' },
  rose: { bg: '#FCE7F3', fg: '#9D174D' },
  gold: { bg: '#FEF3C7', fg: '#92400E' },
  violet: { bg: '#EDE9FE', fg: '#5B21B6' },
  mint: { bg: '#CCFBF1', fg: '#115E59' },
  red: { bg: '#FFE4E6', fg: '#9F1239' },
  /** Ảnh đại diện nhóm trên trang nhóm — ăn theo tông ảnh bìa tối. */
  dusk: { bg: '#1D3557', fg: '#F2CC8F' },
} as const;

export type Tone = keyof typeof TONE;

/**
 * Tên font SAU KHI `useFonts` nạp xong ở `app/_layout.tsx`. Font mới: thêm vào `useFonts` VÀ vào đây
 * cùng lúc. Không dùng `fontWeight` để giả đậm — RN cần đúng family đã nạp.
 */
export const F = {
  ui: 'BeVietnamPro_400Regular',
  uiMedium: 'BeVietnamPro_500Medium',
  uiSemi: 'BeVietnamPro_600SemiBold',
  uiBold: 'BeVietnamPro_700Bold',
  uiBlack: 'BeVietnamPro_800ExtraBold',
} as const;

/**
 * Bo góc theo bốn bậc của hệ thống thiết kế: nút nhỏ · ô nhập và nút chính · thẻ · khối lớn. Thiết kế
 * gốc cho mỗi bậc một khoảng (10–12, 14–16, 18–20, 24–28); bảng này chốt một số mỗi bậc. `xs` nằm
 * ngoài bốn bậc: ô tích và góc nhọn của bong bóng chat — chi tiết nhỏ hơn một nút.
 */
export const R = { xs: 6, sm: 12, md: 16, lg: 20, xl: 28, full: 999 } as const;

/** Khoảng cách theo bội số 4. Số lẻ port từ CSS gốc vẫn được viết thẳng, nhưng không vào bảng này. */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/**
 * Đổ bóng cross-platform. `Platform.select` trả `T | undefined` dù nhánh `default` luôn có, nên `as
 * object` để spread vào `StyleSheet.create` không vỡ — đây là assertion duy nhất được chấp nhận
 * (typescript.convention §8), đừng nhân bản pattern này sang chỗ khác.
 */
export const shadow = Platform.select({
  ios: {
    shadowColor: C.ink,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
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

/** Bóng xanh của nút Đăng tin nổi giữa thanh điều hướng. Android chỉ có `elevation`, không màu. */
export const shadowBrand = Platform.select({
  ios: {
    shadowColor: C.brand,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  default: { elevation: 8 },
}) as object;

/**
 * Các chặng màu cho gradient vẽ bằng `react-native-svg` (RN không có `linear-gradient`). Ghép tay
 * `stop-color` tại call-site là cách sinh dải lệch lúc palette đổi.
 */
export const G = {
  /** Nền hero trang chủ: toả tròn từ góc trên phải. */
  hero: [C.brandHi, C.brandDark, C.brandDeep],
} as const;
