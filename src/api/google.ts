import { Platform, TurboModuleRegistry } from 'react-native';
import type * as GoogleLib from '@react-native-google-signin/google-signin';
import { ApiError } from './http';

/**
 * Client "Web" của Google Cloud, không phải client Android: ID token lấy trên Android mang client này ở `aud`, và
 * ghim-server chỉ nhận token có `aud` nằm trong `GOOGLE_CLIENT_IDS`. Client id không phải secret (HARD#19) — Google
 * nhúng nó vào mọi app; client secret thì không bao giờ vào repo này.
 */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

/**
 * Web: bản miễn phí của thư viện không chạy trên web — người dùng chốt 28/10/2026 ẩn nút. Expo Go và bản dev build
 * dựng trước khi thêm thư viện không có module native, mà thư viện đọc hằng số native ngay lúc được import: nạp nó ở
 * đầu file thì app sập lúc mở, nên chỉ nạp khi bấm nút và ẩn nút khi module vắng.
 */
export const googleSignInAvailable =
  Platform.OS !== 'web' &&
  Boolean(WEB_CLIENT_ID) &&
  TurboModuleRegistry.get('RNGoogleSignin') != null;

/**
 * Đăng xuất Google trước khi mở bảng chọn: phiên đăng nhập là của ghim-server, còn thư viện nhớ tài khoản Google lần
 * trước thì trả luôn tài khoản đó — người vừa đăng xuất khỏi Ghim không chọn được tài khoản khác.
 */
async function pickAccount(): Promise<GoogleLib.SignInResponse> {
  // `require` chứ không `import()`: jest-expo không chạy được import động, Metro thì nạp `require` ngay tại chỗ gọi.
  const { GoogleSignin, isErrorWithCode, statusCodes } =
    require('@react-native-google-signin/google-signin') as typeof GoogleLib;
  try {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signOut();
    return await GoogleSignin.signIn();
  } catch (e) {
    // Lỗi của thư viện mang mã trần ("10" trên Android = SHA-1 hay package chưa khớp client Android trên Google
    // Cloud) — giữ mã trong câu để còn tra.
    if (!isErrorWithCode(e)) throw e;
    if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new ApiError(
        'GOOGLE_PLAY_SERVICES',
        'Máy này chưa có hoặc cần cập nhật Google Play Services',
        0,
      );
    }
    throw new ApiError(
      'GOOGLE_SIGN_IN_FAILED',
      `Không đăng nhập được bằng Google (mã ${e.code})`,
      0,
    );
  }
}

/** ID token cho `api.loginWithGoogle`; `null` khi người dùng huỷ bảng chọn tài khoản. */
export async function googleIdToken(): Promise<string | null> {
  const response = await pickAccount();
  if (response.type === 'cancelled') return null;
  // Thư viện chỉ trả ID token khi được cấu hình `webClientId`.
  if (!response.data.idToken) {
    throw new ApiError('GOOGLE_NO_TOKEN', 'App thiếu cấu hình client Google, hãy báo quản trị', 0);
  }
  return response.data.idToken;
}
