/**
 * Key factory — nơi DUY NHẤT đặt query key (HARD#3). Call-site không viết array literal.
 *
 * `as const` trên từng return là bắt buộc: TanStack cần key là readonly tuple để suy luận đúng.
 * Thêm key mới = thêm một hàm vào đây, kể cả key không tham số.
 */
export const qk = {
  health: () => ['health'] as const,
};
