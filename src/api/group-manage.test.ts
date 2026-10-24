import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { groupManageApi, memberActionsOf, modeNoteOf } from './group-manage';

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

  it('cấm là PUT theo tài khoản; danh sách cấm đổi accountId thành id', async () => {
    const calls = serve(
      page([
        {
          accountId: 'u-3',
          displayName: 'Cường',
          bannedAt: '2026-10-21T00:00:00.000Z',
          bannedBy: 'u-1',
        },
      ]),
    );
    await groupManageApi.ban('g-1', 'u-3');
    expect((await groupManageApi.bans('g-1')).items).toEqual([
      { id: 'u-3', name: 'Cường', bannedAt: '2026-10-21T00:00:00.000Z' },
    ]);
    expect(calls[0]).toMatchObject({ method: 'PUT', path: '/api/v1/groups/g-1/bans/u-3' });
  });

  it('danh sách lớp: không chọn lớp thì dòng không có unitId; cài đặt gửi đúng khoá đã đổi', async () => {
    const calls = serve({ added: 2 });
    expect(
      await groupManageApi.addRoster('g-1', [
        { email: 'an@truong.vn', unitId: null },
        { email: 'binh@truong.vn', unitId: 'un-1' },
      ]),
    ).toBe(2);
    await groupManageApi.updateSettings('g-1', { mode: 'public_open', description: null });
    expect(calls.map((c) => c.body)).toEqual([
      { entries: [{ email: 'an@truong.vn' }, { email: 'binh@truong.vn', unitId: 'un-1' }] },
      { mode: 'public_open', description: null },
    ]);
  });

  it('chuyển chủ trả về hạn trả lời của người nhận', async () => {
    serve({
      id: 'o-1',
      groupId: 'g-1',
      groupName: 'Nhóm',
      kind: 'transfer',
      expiresAt: '2026-11-07T00:00:00.000Z',
    });
    expect(await groupManageApi.transferOwnership('g-1', 'u-2')).toEqual({
      expiresAt: '2026-11-07T00:00:00.000Z',
    });
  });
});

const member = (unitId: string | null) => ({ role: 'member' as const, unitId });

describe('ai xử được gì trên một thành viên', () => {
  const owner = { role: 'owner' as const, moderatorUnitId: null, hasUnits: true };
  const wholeMod = { role: 'moderator' as const, moderatorUnitId: null, hasUnits: true };
  const unitMod = { role: 'moderator' as const, moderatorUnitId: 'un-1', hasUnits: true };

  it('không ai xử được chủ nhóm', () => {
    expect(memberActionsOf(owner, { role: 'owner', unitId: null })).toEqual([]);
    expect(memberActionsOf(wholeMod, { role: 'owner', unitId: null })).toEqual([]);
  });

  it('chủ nhóm làm được mọi việc; điều hành viên đang giữ vai thì bãi nhiệm thay vì bổ nhiệm', () => {
    expect(memberActionsOf(owner, member('un-1'))).toEqual([
      'unit',
      'moderator',
      'transfer',
      'remove',
      'ban',
    ]);
    expect(memberActionsOf(owner, { role: 'moderator', unitId: null })).toEqual([
      'unit',
      'dismiss',
      'transfer',
      'remove',
      'ban',
    ]);
    expect(memberActionsOf({ ...owner, hasUnits: false }, member(null))).toEqual([
      'moderator',
      'transfer',
      'remove',
      'ban',
    ]);
  });

  it('điều hành viên không xử điều hành viên khác; điều hành viên lớp chỉ xử thành viên lớp mình', () => {
    expect(memberActionsOf(wholeMod, { role: 'moderator', unitId: null })).toEqual([]);
    expect(memberActionsOf(wholeMod, member('un-2'))).toEqual(['unit', 'remove', 'ban']);
    expect(memberActionsOf(unitMod, member('un-1'))).toEqual(['remove', 'ban']);
    expect(memberActionsOf(unitMod, member('un-2'))).toEqual([]);
    expect(memberActionsOf(unitMod, member(null))).toEqual([]);
  });
});

describe('hệ quả của đổi cách vào', () => {
  it('công khai sang riêng tư đi qua trạng thái chuyển; riêng tư sang công khai không hạ gì', () => {
    expect(modeNoteOf('public_open', 'private_invite')).toMatch(/đang chuyển sang riêng tư/);
    expect(modeNoteOf('private_code', 'public_review')).toBeNull();
    expect(modeNoteOf('public_open', 'public_open')).toBeNull();
  });

  it('cùng phía: huỷ đơn chờ, mã hết hiệu lực, hay sinh mã mới', () => {
    expect(modeNoteOf('public_review', 'public_open')).toMatch(/đơn đang chờ bị huỷ/);
    expect(modeNoteOf('private_code', 'private_invite')).toMatch(/Mã nhóm hết hiệu lực/);
    expect(modeNoteOf('private_invite', 'private_code')).toMatch(/mã nhóm mới/);
    expect(modeNoteOf('public_open', 'public_review')).toBeNull();
  });
});
