import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { auditActionLabel, detailsLabel, jobLabel } from './admin-labels';
import { adminApi } from './ops-admin';

/** Server giả: ghi lại phương thức, đường dẫn, query, body của từng lượt gọi; mọi lượt trả `data`. */
function serve(data: unknown = {}) {
  const calls: { method: string; path: string; query: string; body: unknown }[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const req = input as Request;
    const text = await req.text();
    const url = new URL(req.url);
    calls.push({
      method: req.method,
      path: url.pathname,
      query: url.search,
      body: text ? JSON.parse(text) : null,
    });
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return calls;
}

const config = {
  version: 8,
  values: { 'group.announcementsPerDay': 5, 'review.slaHours': 24 },
  note: null,
  createdBy: 'm-1',
  createdAt: '2026-10-26T10:00:00.000Z',
};

describe('quản trị trên bàn vận hành', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gậy: ân xá nhiều cảnh cáo một lý do, gỡ khoá, nhận xét đã cắt khoảng trắng', async () => {
    const calls = serve([]);

    await adminApi.amnesty({
      accountId: 'u-1',
      strikeIds: ['s-1', 's-2'],
      reason: 'Khiếu nại muộn',
    });
    await adminApi.liftPermanent('s-9');
    await adminApi.commentStrike({ strikeId: 's-9', body: '  Có thêm bằng chứng  ' });

    expect(calls.map(({ method, path, body }) => ({ method, path, body }))).toEqual([
      {
        method: 'POST',
        path: '/api/v1/ops/trust/accounts/u-1/amnesty',
        body: { strikeIds: ['s-1', 's-2'], reason: 'Khiếu nại muộn' },
      },
      { method: 'POST', path: '/api/v1/ops/trust/strikes/s-9/lift', body: null },
      {
        method: 'POST',
        path: '/api/v1/ops/trust/strikes/s-9/comments',
        body: { body: 'Có thêm bằng chứng' },
      },
    ]);
  });

  it('bảng con số: lưu đúng phiên bản gốc và phần đổi, ghi chú trống thì không gửi', async () => {
    const calls = serve(config);

    const saved = await adminApi.saveConfig({
      baseVersion: 8,
      changes: { 'group.announcementsPerDay': 6 },
    });

    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/api/v1/ops/config',
      body: { baseVersion: 8, changes: { 'group.announcementsPerDay': 6 } },
    });
    expect(saved).toEqual({
      version: 8,
      values: { 'group.announcementsPerDay': 5, 'review.slaHours': 24 },
      note: null,
      createdAt: '2026-10-26T10:00:00.000Z',
    });
  });

  it('quy định sàn đọc cả điều đã tắt, xếp theo thứ tự', async () => {
    const calls = serve([
      { id: 'a-2', code: 'D2', title: 'Hai', text: 't', active: false, sort: 2 },
      { id: 'a-1', code: 'D1', title: 'Một', text: 't', active: true, sort: 1 },
    ]);

    const articles = await adminApi.ruleArticles();

    expect(calls[0]?.query).toBe('?includeInactive=true');
    expect(articles.map((a) => a.code)).toEqual(['D1', 'D2']);
  });

  it('nhật ký và việc nền: mã của server thành chữ; mã lạ giữ nguyên', () => {
    expect(auditActionLabel('identity.account.unlock')).toBe('Mở khoá tài khoản');
    expect(auditActionLabel('foo.bar.baz')).toBe('foo.bar.baz');
    expect(jobLabel('review.every-minute')).toBe('Việc duyệt: mỗi phút (nhả việc quá hạn nhận)');
    expect(detailsLabel({ cause: 'strike', name: 'Điện thoại', empty: null })).toBe(
      'vì: cảnh cáo · tên: Điện thoại',
    );
    expect(detailsLabel({})).toBeNull();
  });
});
