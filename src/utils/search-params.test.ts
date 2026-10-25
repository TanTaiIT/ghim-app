import { describe, expect, it } from '@jest/globals';
import { NO_FILTERS } from '@/api/client';
import { filtersFromParams, toSearchParams } from './search-params';

describe('tham số màn tìm kiếm', () => {
  it('đi rồi về giữ nguyên bộ lọc của lượt tìm đã lưu', () => {
    const filters = {
      ...NO_FILTERS,
      q: 'xe đạp',
      categoryId: 'c-1',
      provinceCode: 79,
      minPrice: 500_000,
      maxPrice: 2_000_000,
    };
    expect(toSearchParams(filters)).toEqual({
      q: 'xe đạp',
      category: 'c-1',
      province: '79',
      min: '500000',
      max: '2000000',
    });
    expect(filtersFromParams(toSearchParams(filters))).toEqual(filters);
  });

  it('thiếu hay sai dạng thì không lọc theo mục đó', () => {
    expect(filtersFromParams({ q: 'bàn', province: 'abc', min: '1.5' })).toEqual({
      ...NO_FILTERS,
      q: 'bàn',
    });
    expect(filtersFromParams({ category: '', province: '' })).toEqual(NO_FILTERS);
    expect(toSearchParams(NO_FILTERS)).toEqual({ q: '' });
  });
});
