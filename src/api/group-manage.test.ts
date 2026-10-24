import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { groupManageApi } from './group-manage';

/** Server giả: ghi lại phương thức, đường dẫn, query, body của từng lượt gọi; mọi lượt trả `data`. */
function serve(data: unknown = {}) {
  const calls: { method: string; path: string; query: string; body: unknown }[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const req = input as Request;
    const url = new URL(req.url);
    const text = await req.text();
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

const page = (items: unknown[]) => ({
  items,
  page: 1,
  limit: 100,
  total: items.length,
  totalPages: 1,
});

describe('quản trị nhóm', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('đơn xin vào: một trang trần 100, tên hiển thị thành `name`', async () => {
    const calls = serve(
      page([
        {
          id: 'r-1',
          groupId: 'g-1',
          accountId: 'u-2',
          displayName: 'An Nguyễn',
          status: 'pending',
          createdAt: '2026-10-20T09:00:00.000Z',
          expiresAt: '2026-11-10T09:00:00.000Z',
        },
      ]),
    );

    expect(await groupManageApi.joinRequests('g-1')).toEqual({
      items: [
        {
          id: 'r-1',
          accountId: 'u-2',
          name: 'An Nguyễn',
          createdAt: '2026-10-20T09:00:00.000Z',
          expiresAt: '2026-11-10T09:00:00.000Z',
        },
      ],
      total: 1,
    });
    expect(calls[0]).toMatchObject({
      method: 'GET',
      path: '/api/v1/groups/g-1/join-requests',
      query: '?limit=100',
    });
  });

  it('duyệt / từ chối đi theo id đơn, không theo nhóm', async () => {
    const calls = serve({ id: 'r-1', status: 'rejected' });
    await groupManageApi.decideJoinRequest('r-1', false);
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/api/v1/group-join-requests/r-1/decision',
      body: { approve: false },
    });
  });

  it('mời: không chọn lớp thì body không có `unitId`; có lớp thì gửi kèm', async () => {
    const calls = serve();
    await groupManageApi.invite('g-1', 'an@truong.vn', null);
    await groupManageApi.invite('g-1', 'an@truong.vn', 'unit-1');
    expect(calls.map((c) => c.body)).toEqual([
      { email: 'an@truong.vn' },
      { email: 'an@truong.vn', unitId: 'unit-1' },
    ]);
    expect(calls[0]?.path).toBe('/api/v1/groups/g-1/invitations');
  });

  it('lời mời đang chờ giữ nguyên email đã che; thu hồi là DELETE theo id lời mời', async () => {
    const calls = serve(
      page([
        {
          id: 'i-1',
          emailHint: 'a***@truong.vn',
          unitId: null,
          createdAt: '2026-10-20T09:00:00.000Z',
          expiresAt: '2026-11-03T09:00:00.000Z',
        },
      ]),
    );
    const listed = await groupManageApi.invitations('g-1');
    expect(listed.items[0]).toEqual({
      id: 'i-1',
      emailHint: 'a***@truong.vn',
      unitId: null,
      createdAt: '2026-10-20T09:00:00.000Z',
      expiresAt: '2026-11-03T09:00:00.000Z',
    });

    await groupManageApi.revokeInvitation('g-1', 'i-1');
    expect(calls[1]).toMatchObject({
      method: 'DELETE',
      path: '/api/v1/groups/g-1/invitations/i-1',
    });
  });

  it('đổi mã trả về mã mới', async () => {
    const calls = serve({ code: 'K7M2PQ' });
    expect(await groupManageApi.rotateCode('g-1')).toBe('K7M2PQ');
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/v1/groups/g-1/code' });
  });
});
