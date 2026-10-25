import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  fieldNameOf,
  normalizeLookupCode,
  opsApi,
  taskKind,
  templateIssue,
  toDecisionBody,
} from './ops';

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

const field = (over: Record<string, unknown> = {}) => ({
  name: 'hang',
  label: 'Hãng',
  type: 'single_choice' as const,
  required: true,
  options: ['Apple'],
  ...over,
});

describe('mẫu thông tin của danh mục', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tên gợi ý từ nhãn: bỏ dấu, đ thành d, chữ thường, gạch dưới', () => {
    expect(fieldNameOf('Năm sản xuất')).toBe('nam_san_xuat');
    expect(fieldNameOf('  Đời máy / Model ')).toBe('doi_may_model');
  });

  it('kiểm nháp như server: nhãn, dạng tên, trùng tên, mục chọn thiếu lựa chọn', () => {
    expect(templateIssue([field()])).toBeNull();
    expect(templateIssue([field({ label: ' ' })])).toMatch(/thiếu nhãn/);
    expect(templateIssue([field({ name: 'Hãng' })])).toMatch(/chữ thường không dấu/);
    expect(templateIssue([field(), field({ label: 'Hãng khác' })])).toMatch(/trùng/);
    expect(templateIssue([field({ options: [] })])).toMatch(/ít nhất một lựa chọn/);
  });

  it('lưu nháp: mục chữ / số không gửi options; khoá lạc quan theo baseDraftVersion', async () => {
    const calls = serve({
      categoryId: 'c-1',
      draftVersion: 3,
      fields: [],
      updatedBy: null,
      updatedAt: null,
    });
    expect(
      await opsApi.saveTemplateDraft('c-1', 2, [
        field(),
        field({ name: 'nam', label: 'Năm', type: 'number', options: [] }),
      ]),
    ).toBe(3);
    expect(calls[0]).toMatchObject({
      method: 'PUT',
      path: '/api/v1/ops/categories/c-1/template/draft',
      body: {
        baseDraftVersion: 2,
        fields: [
          {
            name: 'hang',
            label: 'Hãng',
            type: 'single_choice',
            required: true,
            options: ['Apple'],
          },
          { name: 'nam', label: 'Năm', type: 'number', required: true },
        ],
      },
    });
  });
});

describe('tra mã tra cứu', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mã gõ tay: bỏ khoảng trắng và gạch nối, viết hoa', () => {
    expect(normalizeLookupCode(' s7kq-2m9x a ')).toBe('S7KQ2M9XA');
  });

  it('lần giữ: luật chạy thử thành cờ, cụm từ thành chữ, đánh dấu mang mã của nó', async () => {
    serve({
      lookupCode: 'AB12CD34',
      listingId: 'l-1',
      listingVersion: 2,
      accountId: 'u-1',
      trigger: 'submission',
      decidedAt: '2026-10-25T00:00:00.000Z',
      outcome: 'hold',
      cause: 'device',
      score: 40,
      band: 'medium',
      tier: 'T0',
      ruleVersion: 3,
      configVersion: 5,
      hits: [
        {
          code: 'ambiguous_phrase',
          label: 'Cụm từ cần xem',
          weight: 20,
          mode: 'trial',
          refs: [],
          phrases: [{ id: 'p-1', text: 'cọc trước' }],
        },
      ],
      deviceFlags: [
        {
          kind: 'many_accounts_on_device',
          label: 'Nhiều tài khoản trên một máy',
          flagLookupCode: 'FL9X',
        },
      ],
    });
    const hold = await opsApi.holdLookup('AB12CD34');
    expect(hold.hits).toEqual([
      {
        code: 'ambiguous_phrase',
        label: 'Cụm từ cần xem',
        weight: 20,
        trial: true,
        phrases: ['cọc trước'],
      },
    ]);
    expect(hold.deviceFlags).toEqual([{ label: 'Nhiều tài khoản trên một máy', flagCode: 'FL9X' }]);
  });

  it('gỡ đánh dấu gửi lý do theo mã', async () => {
    const calls = serve({ cleared: true });
    await opsApi.clearFlag('FL9X', 'Máy mua lại');
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/api/v1/ops/flags/FL9X/clear',
      body: { reason: 'Máy mua lại' },
    });
  });
});

describe('quyền staff', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const wire = {
    accountId: 'u-1',
    scopes: ['support'],
    categoryIds: ['c-1'],
    status: 'suspended',
    suspendedReason: 'Tài khoản bị khoá',
    grantedAt: '2026-10-20T00:00:00.000Z',
  };

  it('danh sách lọc theo danh mục; trạng thái thành cờ treo', async () => {
    const calls = serve([wire]);
    expect(await opsApi.staff('c-1')).toEqual([
      {
        accountId: 'u-1',
        scopes: ['support'],
        categoryIds: ['c-1'],
        suspended: true,
        suspendedReason: 'Tài khoản bị khoá',
        grantedAt: '2026-10-20T00:00:00.000Z',
      },
    ]);
    expect(calls[0]?.path).toBe('/api/v1/ops/staff');
  });

  it('gắn quyền gửi trọn phạm vi; thu là DELETE; trả lại là POST restore', async () => {
    const calls = serve({ ...wire, status: 'active', suspendedReason: null });
    await opsApi.setStaff('u-1', { scopes: ['support', 'user_reports'], categoryIds: [] });
    await opsApi.revokeStaff('u-1');
    await opsApi.restoreStaff('u-1');
    expect(calls.map((c) => [c.method, c.path, c.body])).toEqual([
      ['PUT', '/api/v1/ops/staff/u-1', { scopes: ['support', 'user_reports'], categoryIds: [] }],
      ['DELETE', '/api/v1/ops/staff/u-1', null],
      ['POST', '/api/v1/ops/staff/u-1/restore', null],
    ]);
  });
});

describe('loại việc quyết định nút nào hiện', () => {
  it('báo cáo thắng mọi lý do khác vì server bắt buộc report.verdict', () => {
    expect(taskKind(['machine_hold', 'report'])).toBe('report');
    expect(taskKind(['report_severe'])).toBe('report');
  });

  it('khiếu nại, gậy nghiêm trọng, nhóm chuyển lên, còn lại là duyệt tin', () => {
    expect(taskKind(['appeal'])).toBe('appeal');
    expect(taskKind(['serious_strike'])).toBe('other');
    expect(taskKind(['group_escalation'])).toBe('escalation');
    // Nhóm chuyển lên một tin máy còn giữ: vẫn phải cho đạt / từ chối tin đó trước.
    expect(taskKind(['group_escalation', 'machine_hold'])).toBe('screen');
    expect(taskKind(['machine_restricted'])).toBe('screen');
    expect(taskKind(['sample_risk'])).toBe('screen');
  });
});

describe('body quyết định gửi server', () => {
  const held = { reasons: ['machine_hold', 'report'] as const };
  const live = { reasons: ['report'] as const };

  it('cho đạt kèm nhận định máy; từ chối là "sai sót" kèm lý do mẫu', () => {
    expect(toDecisionBody(live, { kind: 'pass', judgment: 'machine_overreach' })).toEqual({
      outcome: 'pass',
      machineJudgment: 'machine_overreach',
    });
    expect(toDecisionBody(live, { kind: 'pass' })).toEqual({ outcome: 'pass' });
    expect(toDecisionBody(live, { kind: 'reject', reasonTemplateId: 'r-1' })).toEqual({
      outcome: 'mistake',
      reasonTemplateId: 'r-1',
    });
  });

  it('gỡ khỏi nhóm: chỉ kèm "trái quy định sàn" và lý do khi nhóm muốn chuyển lên staff', () => {
    expect(toDecisionBody(held, { kind: 'detach', platformViolation: false })).toEqual({
      outcome: 'detach',
    });
    expect(
      toDecisionBody(held, { kind: 'detach', platformViolation: true, note: 'Bán hàng giả' }),
    ).toEqual({ outcome: 'detach', platformViolation: true, note: 'Bán hàng giả' });
  });

  it('bác báo cáo về tin đang hiện là giữ nguyên; về tin máy còn giữ phải là cho đạt', () => {
    expect(toDecisionBody(live, { kind: 'report', verdict: 'dismissed' })).toEqual({
      outcome: 'keep',
      report: { verdict: 'dismissed' },
    });
    expect(
      toDecisionBody(
        { reasons: [...held.reasons] },
        { kind: 'report', verdict: 'dismissed', judgment: 'machine_right' },
      ),
    ).toEqual({
      outcome: 'pass',
      machineJudgment: 'machine_right',
      report: { verdict: 'dismissed' },
    });
  });

  it('báo cáo đúng: gỡ tin bằng lý do mẫu, hay khoá tài khoản mà giữ nguyên tin', () => {
    expect(toDecisionBody(live, { kind: 'report', verdict: 'upheld', removeWith: 'r-2' })).toEqual({
      outcome: 'mistake',
      reasonTemplateId: 'r-2',
      report: { verdict: 'upheld' },
    });
    expect(toDecisionBody(live, { kind: 'report', verdict: 'upheld', lockAccount: true })).toEqual({
      outcome: 'keep',
      report: { verdict: 'upheld', lockAccount: true },
    });
  });

  it('bác việc nhóm chuyển lên kèm ghi chú; khiếu nại gậy giữ nguyên tin', () => {
    expect(toDecisionBody(live, { kind: 'dismissEscalation', note: 'Không vi phạm' })).toEqual({
      outcome: 'dismiss',
      note: 'Không vi phạm',
    });
    expect(toDecisionBody(live, { kind: 'appeal', verdict: 'won' })).toEqual({
      outcome: 'keep',
      appeal: { verdict: 'won' },
    });
  });
});

describe('gọi bàn vận hành', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('quyết định luôn nhận việc trước rồi mới gửi quyết định, cùng một việc', async () => {
    const calls = serve({
      taskId: 't-1',
      claimExpiresAt: '2026-10-21T10:00:00Z',
      listingVersion: 3,
    });
    await opsApi.decide({ id: 't-1', reasons: ['machine_restricted'] }, { kind: 'pass' });
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /api/v1/ops/review/tasks/t-1/claim',
      'POST /api/v1/ops/review/tasks/t-1/decision',
    ]);
    expect(calls[1]?.body).toEqual({ outcome: 'pass' });
  });
});

describe('bảng số theo ngày', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hỏi đúng route, trả mảng ngày của server nguyên vẹn (hôm nay trước)', async () => {
    const day = {
      day: '2026-10-24',
      newAccounts: 1,
      submissions: 3,
      firstLive: 2,
      machine: { passFull: 1, passLimited: 1, hold: 1 },
      decisions: { passed: 1, rejected: 2 },
    };
    const calls = serve({ timeZone: 'Asia/Ho_Chi_Minh', days: [day] });
    await expect(opsApi.dailyStats(7)).resolves.toEqual([day]);
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/v1/ops/stats/daily' });
  });
});

describe('số liệu máy theo tháng', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hỏi đúng route với số tháng, trả tháng và luật của server nguyên vẹn', async () => {
    const data = {
      months: [
        {
          month: '2026-10',
          runs: 3,
          passFull: 2,
          passLimited: 0,
          hold: 1,
          low: 2,
          medium: 0,
          high: 1,
        },
      ],
      topRules: [{ code: 'price_low', label: 'Giá thấp bất thường', runs: 1 }],
    };
    const calls = serve(data);
    await expect(opsApi.machineStats(12)).resolves.toEqual(data);
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/v1/ops/screening/stats' });
  });
});

describe('danh bạ tài khoản', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const wire = {
    id: 'u-1',
    displayName: 'Bình Người Mua',
    email: 'app.buyer@ghim.local',
    role: 'user',
    status: 'locked',
    createdAt: '2026-10-20T00:00:00.000Z',
    lockedAt: '2026-10-23T00:00:00.000Z',
    lockedReason: 'Lừa đặt cọc',
    tier: 'T1',
    struck: true,
  };

  it('trang danh bạ giữ nguyên các trường server trả; hỏi đúng route', async () => {
    const calls = serve({ items: [wire], total: 1, page: 1, limit: 20, totalPages: 1 });
    const result = await opsApi.accounts('bình', 'locked', 1);
    expect(result).toEqual({ items: [wire], total: 1, page: 1, totalPages: 1 });
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/v1/ops/accounts' });
  });

  it('thẻ tài khoản thêm điểm vi phạm', async () => {
    serve({ ...wire, strikePoints: 2 });
    await expect(opsApi.account('u-1')).resolves.toEqual({ ...wire, strikePoints: 2 });
  });
});

describe('luật máy duyệt', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const wireRules = {
    version: 7,
    rules: [
      { code: 'image_too_small', label: 'Ảnh quá nhỏ', kind: 'quality', weight: 0, mode: 'trial' },
      { code: 'burst', label: 'Đăng dồn', kind: 'signal', weight: 20, mode: 'on' },
      { code: 'duplicate_image', label: 'Ảnh trùng', kind: 'gate', weight: 0, mode: 'on' },
    ],
    overrides: [],
    bands: [],
    defaultBands: { mediumFrom: 30, highFrom: 60 },
  };

  it('chỉ giữ luật chung, xếp theo tên', async () => {
    serve(wireRules);
    expect((await opsApi.screeningRules()).map((r) => [r.label, r.kind, r.mode])).toEqual([
      ['Ảnh quá nhỏ', 'quality', 'trial'],
      ['Ảnh trùng', 'gate', 'on'],
      ['Đăng dồn', 'signal', 'on'],
    ]);
  });

  it('đổi chế độ: PATCH đúng mã luật, chỉ gửi chế độ, trả bộ luật mới', async () => {
    const calls = serve(wireRules);
    const rules = await opsApi.setRuleMode({ code: 'image_too_small', mode: 'on' });
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'PATCH /api/v1/ops/screening/rules/image_too_small',
    ]);
    expect(calls[0]?.body).toEqual({ mode: 'on' });
    expect(rules).toHaveLength(3);
  });
});
