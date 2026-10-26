import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { categoryScreening, screeningApi } from './ops-screening';

/** Server giả: ghi lại phương thức, đường dẫn, body của từng lượt gọi; mọi lượt trả `data`. */
function serve(data: unknown = {}) {
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

const book = {
  version: 7,
  rules: [
    { code: 'new_account', label: 'Tài khoản mới', kind: 'signal', weight: 10, mode: 'on' },
    { code: 'abnormal_price', label: 'Giá bất thường', kind: 'signal', weight: 15, mode: 'on' },
  ],
  overrides: [
    { code: 'abnormal_price', categoryId: 'dm-1', weight: null, mode: 'off' },
    { code: 'new_account', categoryId: 'dm-2', weight: 30, mode: null },
  ],
  bands: [{ categoryId: 'dm-1', mediumFrom: 20, highFrom: 50 }],
  defaultBands: { mediumFrom: 30, highFrom: 60 },
} as Parameters<typeof categoryScreening>[0];

describe('máy duyệt của một danh mục', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('chỉ lấy ghi đè và ngưỡng của đúng danh mục; luật xếp theo tên', () => {
    expect(categoryScreening(book, 'dm-1')).toEqual({
      rules: [
        {
          code: 'abnormal_price',
          label: 'Giá bất thường',
          kind: 'signal',
          weight: 15,
          mode: 'on',
          override: { weight: null, mode: 'off' },
        },
        {
          code: 'new_account',
          label: 'Tài khoản mới',
          kind: 'signal',
          weight: 10,
          mode: 'on',
          override: null,
        },
      ],
      bands: { mediumFrom: 20, highFrom: 50 },
      defaultBands: { mediumFrom: 30, highFrom: 60 },
    });
    expect(categoryScreening(book, 'dm-3').bands).toBeNull();
  });

  it('ghi đè gửi đúng phần đã chọn; từ khoá và bật cụm sớm đi đúng đường', async () => {
    const calls = serve({ keywords: ['DEN BAN'] });

    await screeningApi.setOverride({ categoryId: 'dm-1', code: 'abnormal_price', mode: 'trial' });
    await screeningApi.setKeywords({ categoryId: 'dm-1', keywords: ['Đèn bàn'] });
    await screeningApi.activatePhrase({ id: 'cum-1', reason: 'Lừa đảo đang lan' }).catch(() => {});

    expect(calls).toEqual([
      {
        method: 'PUT',
        path: '/api/v1/ops/screening/rules/abnormal_price/categories/dm-1',
        body: { mode: 'trial' },
      },
      {
        method: 'PUT',
        path: '/api/v1/ops/screening/categories/dm-1/keywords',
        body: { keywords: ['Đèn bàn'] },
      },
      {
        method: 'POST',
        path: '/api/v1/ops/screening/phrases/cum-1/activate',
        body: { reason: 'Lừa đảo đang lan' },
      },
    ]);
  });
});
