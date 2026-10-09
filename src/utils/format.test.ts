import { describe, expect, it } from '@jest/globals';
import {
  daysUntil,
  formatAgo,
  formatDay,
  formatMillionRange,
  formatVnd,
  groupThousands,
  parseDigits,
} from './format';

const NOW = new Date('2026-10-09T10:00:00Z').getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;

describe('giá tiền', () => {
  it('nhóm hàng nghìn bằng dấu chấm', () => {
    expect(groupThousands(13_900_000)).toBe('13.900.000');
    expect(groupThousands(450_000)).toBe('450.000');
    expect(groupThousands(999)).toBe('999');
    expect(formatVnd(3_800_000)).toBe('3.800.000 đ');
  });

  it('đọc lại số từ chuỗi đã định dạng', () => {
    expect(parseDigits('13.900.000 đ')).toBe(13_900_000);
    expect(parseDigits('')).toBe(0);
    expect(parseDigits('abc')).toBe(0);
  });

  it('khoảng triệu dùng dấu phẩy thập phân', () => {
    expect(formatMillionRange(13_000_000, 15_000_000)).toBe('13 – 15 triệu');
    expect(formatMillionRange(2_500_000, 5_000_000)).toBe('2,5 – 5 triệu');
  });
});

describe('formatAgo', () => {
  it('theo từng bậc phút, giờ, hôm qua, ngày', () => {
    expect(formatAgo(ago(20_000), NOW)).toBe('Vừa xong');
    expect(formatAgo(ago(15 * MIN), NOW)).toBe('15 phút trước');
    expect(formatAgo(ago(3 * 60 * MIN), NOW)).toBe('3 giờ trước');
    expect(formatAgo(ago(30 * 60 * MIN), NOW)).toBe('Hôm qua');
    expect(formatAgo(ago(3 * 24 * 60 * MIN), NOW)).toBe('3 ngày trước');
  });

  it('bản rút gọn bỏ chữ "trước"', () => {
    expect(formatAgo(ago(10 * MIN), NOW, true)).toBe('10 phút');
  });

  it('quá một tuần thì hiện ngày', () => {
    expect(formatAgo(ago(10 * 24 * 60 * MIN), NOW)).toMatch(/^\d{2}\/\d{2}\/2026$/);
  });
});

describe('formatDay', () => {
  it('theo ngày lịch, không theo số giờ', () => {
    const now = new Date(2026, 9, 9, 0, 30).getTime();
    expect(formatDay(new Date(2026, 9, 9, 0, 5).toISOString(), now)).toBe('Hôm nay');
    // 23:50 hôm trước mới cách 40 phút nhưng đã là "Hôm qua".
    expect(formatDay(new Date(2026, 9, 8, 23, 50).toISOString(), now)).toBe('Hôm qua');
    expect(formatDay(new Date(2026, 9, 1, 12, 0).toISOString(), now)).toBe('01/10/2026');
  });
});

describe('daysUntil', () => {
  it('làm tròn lên và không âm', () => {
    expect(daysUntil(new Date(NOW + 60 * MIN).toISOString(), NOW)).toBe(1);
    expect(daysUntil(new Date(NOW + 2 * 24 * 60 * MIN).toISOString(), NOW)).toBe(2);
    expect(daysUntil(new Date(NOW - MIN).toISOString(), NOW)).toBe(0);
  });
});
