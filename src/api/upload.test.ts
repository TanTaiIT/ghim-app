import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { api, IMAGE_TOO_SMALL } from './client';
import { ApiError } from './http';

/* Ảnh tin nén xong nhỏ hơn cạnh ngắn tối thiểu của phiếu tải ảnh thì chặn trước khi tải (add-image-quality-checks). */
const mockSaved = { width: 0, height: 0 };

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      resize: () => undefined,
      renderAsync: async () => ({
        saveAsync: async () => ({ uri: 'file:///nen.jpg', ...mockSaved }),
      }),
    }),
  },
}));

jest.mock('expo-file-system', () => ({
  File: class {
    size = 2048;
  },
}));

const STORAGE_URL = 'https://kho.test/upload';

/** Server giả: phiếu tải ảnh với cạnh ngắn tối thiểu 480, kho nhận mọi tệp. Ghi lại URL đã gọi. */
function serve() {
  const calls: string[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    calls.push(url);
    if (url === STORAGE_URL) return new Response(null, { status: 200 });
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          imageId: 'anh-1',
          minShortSide: 480,
          upload: { method: 'PUT', url: STORAGE_URL, headers: {}, fields: {}, expiresAt: '' },
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  });
  return calls;
}

describe('tải ảnh của tin', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ảnh nén xong 640×360: báo quá nhỏ kèm cạnh ngắn tối thiểu, không gửi gì lên kho', async () => {
    Object.assign(mockSaved, { width: 640, height: 360 });
    const calls = serve();
    const upload = api.uploadPhoto('tin-1', { uri: 'file:///goc.jpg', width: 640, height: 360 });
    await expect(upload).rejects.toBeInstanceOf(ApiError);
    await expect(upload).rejects.toMatchObject({
      code: IMAGE_TOO_SMALL,
      message: 'Ảnh quá nhỏ, cần cạnh ngắn từ 480px',
    });
    expect(calls).not.toContain(STORAGE_URL);
  });

  it('ảnh nén xong 640×480: đủ cạnh ngắn, tải lên kho và trả mã ảnh', async () => {
    Object.assign(mockSaved, { width: 640, height: 480 });
    const calls = serve();
    await expect(
      api.uploadPhoto('tin-1', { uri: 'file:///goc.jpg', width: 640, height: 480 }),
    ).resolves.toBe('anh-1');
    expect(calls).toContain(STORAGE_URL);
  });
});
