import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ApiError, createClientConfig, setHttpAccessToken, setSessionRefresher } from './http';

describe('createClientConfig', () => {
  afterEach(() => setHttpAccessToken(null));

  it('giữ config gốc, gắn baseUrl và trả token hiện tại qua auth()', () => {
    const cfg = createClientConfig({ headers: { 'x-app': 'ghim' } });
    expect(cfg.baseUrl).toMatch(/^https?:\/\//);
    expect(cfg.headers).toEqual({ 'x-app': 'ghim' });

    expect(cfg.auth()).toBeUndefined();
    setHttpAccessToken('tok');
    expect(cfg.auth()).toBe('tok');
  });
});

const sdkFetch = createClientConfig({}).fetch;

const withBearer = (token: string, body?: string) =>
  new Request('http://ghim.test/api/v1/me', {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body,
  });

/** Server giả: chỉ nhận đúng một token, còn lại 401; ghi lại header + body từng lượt gửi. */
function serverAccepting(good: string) {
  const seen: { auth: string | null; body: string }[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const req = input as Request;
    const auth = req.headers.get('Authorization');
    seen.push({ auth, body: await req.text() });
    return new Response(null, { status: auth === `Bearer ${good}` ? 200 : 401 });
  });
  return seen;
}

describe('fetch của SDK khi gặp 401', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    setHttpAccessToken(null);
    setSessionRefresher(null);
  });

  it('request không có Bearer đi thẳng: 401 của đăng nhập không kích refresh', async () => {
    const refresher = jest.fn(async () => 'new');
    setSessionRefresher(refresher);
    serverAccepting('new');
    const res = await sdkFetch(
      new Request('http://ghim.test/api/v1/auth/login', { method: 'POST' }),
    );
    expect(res.status).toBe(401);
    expect(refresher).not.toHaveBeenCalled();
  });

  it('các request cùng dính 401 dùng chung MỘT lượt refresh, gửi lại nguyên body bằng token mới', async () => {
    setHttpAccessToken('old');
    const refresher = jest.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 'new';
    });
    setSessionRefresher(refresher);
    const seen = serverAccepting('new');

    const [a, b] = await Promise.all([
      sdkFetch(withBearer('old', '{"text":"chào"}')),
      sdkFetch(withBearer('old')),
    ]);

    expect([a.status, b.status]).toEqual([200, 200]);
    expect(refresher).toHaveBeenCalledTimes(1);
    expect(seen.filter((s) => s.auth === 'Bearer new').map((s) => s.body)).toContain(
      '{"text":"chào"}',
    );
  });

  it('request bay với token cũ khi phiên vừa được làm mới: gửi lại bằng token hiện tại, không xoay thêm', async () => {
    setHttpAccessToken('new');
    const refresher = jest.fn(async () => 'newer');
    setSessionRefresher(refresher);
    serverAccepting('new');

    const res = await sdkFetch(withBearer('old'));
    expect(res.status).toBe(200);
    expect(refresher).not.toHaveBeenCalled();
  });

  it('lượt refresh ném lỗi thì lỗi đó tới tay request gốc', async () => {
    setHttpAccessToken('old');
    const revoked = new ApiError('SESSION_REVOKED', 'Phiên đã bị thu hồi, đăng nhập lại', 401);
    setSessionRefresher(async () => {
      throw revoked;
    });
    serverAccepting('new');
    await expect(sdkFetch(withBearer('old'))).rejects.toBe(revoked);
  });

  it('không còn phiên để làm mới thì trả nguyên 401 cho unwrap', async () => {
    setHttpAccessToken('old');
    setSessionRefresher(async () => null);
    serverAccepting('new');
    expect((await sdkFetch(withBearer('old'))).status).toBe(401);
  });
});

describe('ApiError', () => {
  it('giữ code, status, message để màn hình rẽ nhánh và toast', () => {
    const e = new ApiError('EMAIL_TAKEN', 'Email đã có tài khoản', 409);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('ApiError');
    expect(e.code).toBe('EMAIL_TAKEN');
    expect(e.status).toBe(409);
    expect(e.message).toBe('Email đã có tài khoản');
  });
});
