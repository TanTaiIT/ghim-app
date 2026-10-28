import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/**
 * Kho phiên: Keychain (iOS) / Keystore (Android) qua `expo-secure-store`, KHÔNG phải AsyncStorage —
 * thứ nằm trong đây là refresh token dùng được suốt 30 ngày, và AsyncStorage trên máy đã root là
 * một file đọc được.
 *
 * Giới hạn cần biết: SecureStore cảnh báo với giá trị trên ~2KB. `partialize` chỉ giữ `session`
 * (hai token, dưới 1KB); nhét thêm vào đó thì phải kiểm lại con số này.
 *
 * Web: `expo-secure-store` là module rỗng (mọi lệnh ném `TypeError`), và trình duyệt không có kho tương
 * đương — `localStorage` thì script nào trên trang cũng đọc được refresh token. Nên web không ghi phiên
 * xuống đâu cả: phiên chỉ sống trong bộ nhớ, tải lại trang là đăng nhập lại.
 *
 * `getItem` của web PHẢI async dù không đọc gì: kho đồng bộ làm `persist` hydrate ngay trong `create()`,
 * `onRehydrateStorage` chạm `useAuthStore` khi biến chưa được gán, zustand nuốt lỗi và `hydrated` kẹt
 * ở false — web dừng ở màn trắng.
 */
const secureStorage: StateStorage =
  Platform.OS === 'web'
    ? { getItem: async () => null, setItem: () => {}, removeItem: () => {} }
    : {
        getItem: (name) => SecureStore.getItemAsync(name),
        setItem: (name, value) => SecureStore.setItemAsync(name, value),
        removeItem: (name) => SecureStore.deleteItemAsync(name),
      };

/**
 * Cặp token của phiên đăng nhập — thứ duy nhất cần sống lâu hơn một màn hình (store.convention §1).
 * Hồ sơ (id, email, tên) thuộc về query `/me`; nhân bản vào đây là có hai nguồn sự thật lệch nhau.
 *
 * Khai lại type thay vì import từ `@/api`: store là lá, không import layer khác (folder §6).
 */
type Session = { accessToken: string; refreshToken: string };

/**
 * Mã của lần cài app, cho luật "một máy tối đa N tài khoản" của server (header `x-device-id` khi lưu và gửi
 * tin; server chỉ giữ HMAC của nó). Không phải bí mật nên `Math.random` là đủ — Hermes không có
 * `crypto.randomUUID` khi chưa cài thêm gói. Nằm chung kho với phiên vì chung lượt hydrate: request đăng tin
 * đầu tiên không bao giờ chạy trước khi mã đọc xong. Web không ghi xuống đâu nên mỗi lần tải trang là một máy.
 */
const newDeviceId = () =>
  Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 2 ** 32)
      .toString(16)
      .padStart(8, '0'),
  ).join('');

type AuthState = {
  session: Session | null;
  deviceId: string;
  /** false cho tới khi đọc xong kho bảo mật — giữ splash để guard không nháy qua màn login. */
  hydrated: boolean;
  /** Cả lúc đăng nhập lẫn lúc refresh: server xoay refresh token mỗi lượt, bản cũ phải bị ghi đè. */
  signIn: (session: Session) => void;
  /** Giữ `deviceId`: đăng xuất không làm máy thành máy khác. */
  signOut: () => void;
  /**
   * Người dùng tắt thông báo đẩy trên máy này (Cài đặt › Thông báo). Là lựa chọn của máy, không của tài khoản — sống qua
   * đăng xuất, để lần đăng nhập sau không tự đăng ký lại token.
   */
  pushOff: boolean;
  setPushOff: (off: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      deviceId: newDeviceId(),
      hydrated: false,
      signIn: (session) => set({ session }),
      signOut: () => set({ session: null }),
      pushOff: false,
      setPushOff: (pushOff) => set({ pushOff }),
    }),
    {
      name: 'ghim-auth',
      storage: createJSONStorage(() => secureStorage),
      // `hydrated` là cờ runtime; ghi xuống đĩa thì lần mở sau đọc lại đúng giá trị cũ (false) và app treo.
      partialize: (s) => ({ session: s.session, deviceId: s.deviceId, pushOff: s.pushOff }),
      // Bản 0 là phiên của dữ liệu mẫu, cầm token giả: giữ lại thì máy đã chạy bản mẫu trông như đang đăng
      // nhập trong khi backend không nhận phiên nào như thế.
      version: 1,
      migrate: () => ({ session: null, deviceId: newDeviceId() }),
      // Chạy cả khi đọc đĩa lỗi — luôn mở khoá splash. Bản ghi thiếu field thì vứt: `useIsAuthenticated`
      // chỉ hỏi `session !== null`, một object rỗng cũng đủ để guard thả vào màn cần đăng nhập. Bản ghi cũ
      // chưa có `deviceId` giữ mã vừa sinh, và `setState` dưới đây ghi luôn nó xuống đĩa.
      onRehydrateStorage: () => (state) => {
        const s = state?.session;
        const usable = Boolean(s?.accessToken && s.refreshToken);
        useAuthStore.setState({ hydrated: true, ...(s && !usable && { session: null }) });
      },
    },
  ),
);

/* --------------------- selector: đọc từng mảnh, không lấy cả store --------------------- */

export const useIsAuthenticated = () => useAuthStore((s) => s.session !== null);
export const useAuthHydrated = () => useAuthStore((s) => s.hydrated);
/** Bản ghi cũ chưa có cờ này: coi như chưa tắt. */
export const usePushOff = () => useAuthStore((s) => s.pushOff === true);
