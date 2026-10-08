import { afterEach, describe, expect, it } from '@jest/globals';
import { ApiError, createClientConfig, setHttpAccessToken } from './http';

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
