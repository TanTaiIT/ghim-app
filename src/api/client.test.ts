import { describe, expect, it } from '@jest/globals';
import { unwrap } from './client';
import { ApiError } from './http';

const response = (status: number) => ({ status }) as Response;

describe('unwrap', () => {
  it('trả data khi vỏ success', async () => {
    const result = unwrap(
      Promise.resolve({
        data: { success: true as const, data: { database: 'up' } },
        response: response(200),
      }),
    );
    await expect(result).resolves.toEqual({ database: 'up' });
  });

  it('đọc vỏ success nằm ở nhánh error (503 của readiness)', async () => {
    const result = unwrap(
      Promise.resolve({
        error: { success: true, data: { database: 'down' } },
        response: response(503),
      }),
    );
    await expect(result).resolves.toEqual({ database: 'down' });
  });

  it('đổi vỏ lỗi thành ApiError giữ code, message, status, details', async () => {
    const result = unwrap(
      Promise.resolve({
        error: {
          success: false,
          error: {
            code: 'EMAIL_TAKEN',
            message: 'Email đã có tài khoản',
            details: { field: 'email' },
          },
        },
        response: response(409),
      }),
    );
    await expect(result).rejects.toMatchObject({
      name: 'ApiError',
      code: 'EMAIL_TAKEN',
      message: 'Email đã có tài khoản',
      status: 409,
      details: { field: 'email' },
    });
    await expect(result).rejects.toBeInstanceOf(ApiError);
  });

  it('không có vỏ (mạng đứt, proxy trả HTML) thì là NETWORK_ERROR', async () => {
    const result = unwrap(Promise.resolve({ error: new TypeError('Network request failed') }));
    await expect(result).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });
});
