import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { promotionApi } from './promotion';

/** Server giả: ghi lại phương thức, đường dẫn, body của từng lượt gọi; mọi lượt trả `data`. */
function serve(data: unknown) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const req = input as Request;
    const text = await req.text();
    calls.push({
      method: req.method,
      path: new URL(req.url).pathname,
      body: text ? JSON.parse(text) : null,
    });
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return calls;
}

const purchase = {
  id: 'p-1',
  productCode: 'featured_3d',
  effect: 'featured',
  price: 2,
  appliedAt: '2026-10-28T03:00:00.000Z',
  expiresAt: '2026-10-31T03:00:00.000Z',
  status: 'applied',
};

describe('gói đẩy tin trả Xu (add-promotions)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('bảng gói của một tin: gói chưa mua được vẫn hiện kèm lý do và mốc thử lại; gói đang chạy và số dư', async () => {
    const calls = serve({
      products: [
        {
          code: 'rank_to_top',
          name: 'Đẩy lên đầu',
          description: null,
          effect: 'rank_to_top',
          durationDays: null,
          price: 1,
          minTier: 'T1',
          purchasable: false,
          reason: 'Gói này đã dùng cho tin, mua lại được từ 10:00 29/10.',
          retryAt: '2026-10-29T03:00:00.000Z',
        },
        {
          code: 'featured_3d',
          name: 'Nổi bật 3 ngày',
          description: 'Tin vào dải Tin nổi bật trong 3 ngày.',
          effect: 'featured',
          durationDays: 3,
          price: 2,
          minTier: 'T1',
          purchasable: true,
          reason: null,
          retryAt: null,
        },
      ],
      running: purchase,
      balance: 5,
    });

    const r = await promotionApi.forListing('l-1');

    expect(calls).toEqual([{ method: 'GET', path: '/api/v1/listings/l-1/promotions', body: null }]);
    expect(r.balance).toBe(5);
    expect(r.running?.expiresAt).toBe('2026-10-31T03:00:00.000Z');
    expect(r.products.map((p) => [p.code, p.purchasable, p.retryAt])).toEqual([
      ['rank_to_top', false, '2026-10-29T03:00:00.000Z'],
      ['featured_3d', true, null],
    ]);
    expect(r.products[0]?.reason).toContain('mua lại được từ');
  });

  it('mua: gửi mã gói và khoá chống lặp theo tin; lượt mua trả về có mốc hết hạn với gói nổi bật', async () => {
    const calls = serve(purchase);

    const r = await promotionApi.buy({
      listingId: 'l-1',
      productCode: 'featured_3d',
      idempotencyKey: 'k-1',
    });

    expect(calls).toEqual([
      {
        method: 'POST',
        path: '/api/v1/listings/l-1/promotions',
        body: { productCode: 'featured_3d', idempotencyKey: 'k-1' },
      },
    ]);
    expect(r).toEqual({
      id: 'p-1',
      productCode: 'featured_3d',
      effect: 'featured',
      price: 2,
      appliedAt: '2026-10-28T03:00:00.000Z',
      expiresAt: '2026-10-31T03:00:00.000Z',
      status: 'applied',
    });
  });
});
