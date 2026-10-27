import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { boostApi, boostOptions, type BoostState } from './boost';

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

const state: BoostState = {
  role: 'staff',
  blocked: null,
  bumpRetryAt: null,
  featuredUntil: null,
  featuredMaxDays: 30,
};
const at = (iso: string) => `lúc ${iso}`;

describe('đẩy tin của người quản trị (add-admin-boost)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('đẩy lên đầu, nổi bật N ngày, bỏ nổi bật: đúng route và thân', async () => {
    const calls = serve(state);

    await boostApi.apply('l-1', 'top');
    await boostApi.apply('l-1', 'featured:7');
    await boostApi.apply('l-1', 'unfeature');
    await boostApi.state('l-1');

    expect(calls).toEqual([
      { method: 'POST', path: '/api/v1/listings/l-1/boost', body: { effect: 'rank_to_top' } },
      {
        method: 'POST',
        path: '/api/v1/listings/l-1/boost',
        body: { effect: 'featured', days: 7 },
      },
      { method: 'DELETE', path: '/api/v1/listings/l-1/featured', body: null },
      { method: 'GET', path: '/api/v1/listings/l-1/boost', body: null },
    ]);
  });

  it('lựa chọn: đẩy được thì lên đầu + các mức nổi bật trong trần; đang chờ thì nói mốc', () => {
    expect(boostOptions(state, at).map((o) => o.value)).toEqual([
      'top',
      'featured:1',
      'featured:3',
      'featured:7',
      'featured:14',
      'featured:30',
    ]);
    expect(boostOptions({ ...state, featuredMaxDays: 7 }, at).map((o) => o.value)).toEqual([
      'top',
      'featured:1',
      'featured:3',
      'featured:7',
    ]);
    expect(boostOptions({ ...state, bumpRetryAt: '2026-10-28T08:00:00.000Z' }, at)[0]?.note).toBe(
      'Đẩy lại được từ lúc 2026-10-28T08:00:00.000Z',
    );
  });

  it('tin không đẩy được: chỉ còn bỏ nổi bật khi đang nổi bật; không thì không có lựa chọn', () => {
    const blocked = { ...state, blocked: 'Tin đang chờ duyệt' };
    expect(boostOptions(blocked, at)).toEqual([]);
    expect(
      boostOptions({ ...blocked, featuredUntil: '2026-11-01T00:00:00.000Z' }, at).map(
        (o) => o.value,
      ),
    ).toEqual(['unfeature']);
  });
});
