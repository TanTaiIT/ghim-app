/*
 * Định dạng hiển thị dùng chung cho component và route. Tự ghép chuỗi thay vì `toLocaleString('vi-VN')`
 * / `Intl.RelativeTimeFormat`: dữ liệu locale của engine JS khác nhau giữa máy, còn giá tiền và thời
 * gian trên thẻ tin phải giống hệt nhau ở mọi nơi.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MILLION = 1_000_000;

const pad = (n: number) => String(n).padStart(2, '0');
const dmy = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const startOfDay = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
const millions = (v: number) => String(Math.round((v / MILLION) * 10) / 10).replace('.', ',');

/** 13900000 → "13.900.000" */
export function groupThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 13900000 → "13.900.000 đ" */
export function formatVnd(value: number): string {
  return `${groupThousands(value)} đ`;
}

/** Ô nhập giá: "13.900.000 đ" → 13900000. Chuỗi không có chữ số nào → 0. */
export function parseDigits(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
}

/** 13000000, 15000000 → "13 – 15 triệu" (gợi ý khoảng giá, chip lọc giá). */
export function formatMillionRange(min: number, max: number): string {
  return `${millions(min)} – ${millions(max)} triệu`;
}

/**
 * Thời gian tương đối trên thẻ tin. `short` bỏ chữ "trước" cho thẻ hai cột — chỗ hẹp, ngữ cảnh đã đủ
 * rõ. Quá một tuần thì hiện ngày: "12 ngày trước" bắt người đọc tự tính.
 */
export function formatAgo(iso: string, now: number = Date.now(), short = false): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const suffix = short ? '' : ' trước';
  if (diff < MINUTE) return 'Vừa xong';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} phút${suffix}`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} giờ${suffix}`;
  if (diff < 2 * DAY) return 'Hôm qua';
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} ngày${suffix}`;
  return dmy(new Date(iso));
}

/** Vạch ngày trong khung chat: theo lịch (qua nửa đêm là sang ngày), không theo số giờ như `formatAgo`. */
export function formatDay(iso: string, now: number = Date.now()): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(d)) / DAY);
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  return dmy(d);
}

/** Số ngày còn lại tới `iso`, làm tròn lên: còn 1 giờ vẫn là "1 ngày", không phải "0 ngày". */
export function daysUntil(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / DAY));
}
