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

type AuthState = {
  session: Session | null;
  /** false cho tới khi đọc xong kho bảo mật — giữ splash để guard không nháy qua màn login. */
  hydrated: boolean;
  /** Cả lúc đăng nhập lẫn lúc refresh: server xoay refresh token mỗi lượt, bản cũ phải bị ghi đè. */
  signIn: (session: Session) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      hydrated: false,
      signIn: (session) => set({ session }),
      signOut: () => set({ session: null }),
    }),
    {
      name: 'ghim-auth',
      storage: createJSONStorage(() => secureStorage),
      // `hydrated` là cờ runtime; ghi xuống đĩa thì lần mở sau đọc lại đúng giá trị cũ (false) và app treo.
      partialize: (s) => ({ session: s.session }),
      // Bản 0 là phiên của dữ liệu mẫu, cầm token giả: giữ lại thì máy đã chạy bản mẫu trông như đang đăng
      // nhập trong khi backend không nhận phiên nào như thế.
      version: 1,
      migrate: () => ({ session: null }),
      // Chạy cả khi đọc đĩa lỗi — luôn mở khoá splash. Bản ghi thiếu field thì vứt: `useIsAuthenticated`
      // chỉ hỏi `session !== null`, một object rỗng cũng đủ để guard thả vào màn cần đăng nhập.
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
