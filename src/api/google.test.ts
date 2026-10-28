import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { GoogleSignin, type User } from '@react-native-google-signin/google-signin';
import { googleIdToken } from './google';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signOut: jest.fn(async () => null),
    signIn: jest.fn(),
  },
  isErrorWithCode: (e: unknown) => e instanceof Error && 'code' in e,
  statusCodes: { PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE' },
}));

const signIn = jest.mocked(GoogleSignin.signIn);

function account(idToken: string | null): User {
  return {
    user: {
      id: 'g-1',
      name: 'Lan',
      email: 'lan@gmail.com',
      photo: null,
      familyName: null,
      givenName: null,
    },
    scopes: [],
    idToken,
    serverAuthCode: null,
  };
}

const nativeError = (code: string) => Object.assign(new Error('native'), { code });

describe('googleIdToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả ID token, và đăng xuất Google trước khi mở bảng chọn để chọn được tài khoản khác', async () => {
    signIn.mockResolvedValueOnce({ type: 'success', data: account('tok') });
    await expect(googleIdToken()).resolves.toBe('tok');
    const signOutAt = jest.mocked(GoogleSignin.signOut).mock.invocationCallOrder[0] ?? Infinity;
    const signInAt = signIn.mock.invocationCallOrder[0] ?? -Infinity;
    expect(signOutAt).toBeLessThan(signInAt);
  });

  it('người dùng huỷ: null, không lỗi', async () => {
    signIn.mockResolvedValueOnce({ type: 'cancelled', data: null });
    await expect(googleIdToken()).resolves.toBeNull();
  });

  it('lỗi của thư viện thành câu tiếng Việt, giữ mã để tra', async () => {
    signIn.mockRejectedValueOnce(nativeError('10'));
    await expect(googleIdToken()).rejects.toMatchObject({
      code: 'GOOGLE_SIGN_IN_FAILED',
      message: 'Không đăng nhập được bằng Google (mã 10)',
    });
  });

  it('máy thiếu Google Play Services', async () => {
    jest
      .mocked(GoogleSignin.hasPlayServices)
      .mockRejectedValueOnce(nativeError('PLAY_SERVICES_NOT_AVAILABLE'));
    await expect(googleIdToken()).rejects.toMatchObject({ code: 'GOOGLE_PLAY_SERVICES' });
    expect(signIn).not.toHaveBeenCalled();
  });

  it('không có ID token (thiếu webClientId) báo đúng lỗi cấu hình, không bị đổi thành lỗi thư viện', async () => {
    signIn.mockResolvedValueOnce({ type: 'success', data: account(null) });
    await expect(googleIdToken()).rejects.toMatchObject({ code: 'GOOGLE_NO_TOKEN' });
  });
});
