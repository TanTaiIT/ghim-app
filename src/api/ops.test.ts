import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { opsApi, taskKind, toDecisionBody } from './ops';

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
