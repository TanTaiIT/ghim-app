import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/**
 * Kho phiên: Keychain (iOS) / Keystore (Android) qua `expo-secure-store`, KHÔNG phải AsyncStorage —
 * thứ nằm trong đây là refresh token dùng được suốt 30 ngày, và AsyncStorage trên máy đã root là
 * một file đọc được.
 *
 * Giới hạn cần biết: SecureStore cảnh báo với giá trị trên ~2KB. `partialize` chỉ giữ `session`
 * (hai JWT + hai chuỗi ngắn, dưới 1KB); nhét thêm vào đó thì phải kiểm lại con số này.
 */
const secureStorage: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};

/**
 * Danh tính của phiên đăng nhập — thứ duy nhất cần sống lâu hơn một màn hình (store.convention §1).
 * Hồ sơ đầy đủ vẫn thuộc về query; nhân bản vào đây là có hai nguồn sự thật lệch nhau.
 *
 * Khai lại type thay vì import từ `@/api`: store là lá, không import layer khác (folder §6).
 */
type Session = {
  accountId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
};

type AuthState = {
  session: Session | null;
  /** false cho tới khi đọc xong kho bảo mật — giữ splash để guard không nháy qua màn login. */
  hydrated: boolean;
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
      // Chạy cả khi đọc đĩa lỗi — luôn mở khoá splash. Bản ghi thiếu field thì vứt: `useIsAuthenticated`
      // chỉ hỏi `session !== null`, một object rỗng cũng đủ để guard thả vào màn cần đăng nhập.
      onRehydrateStorage: () => (state) => {
        const s = state?.session;
        const usable = Boolean(s?.accountId && s.accessToken && s.refreshToken);
        useAuthStore.setState({ hydrated: true, ...(s && !usable && { session: null }) });
      },
    },
  ),
);

/* --------------------- selector: đọc từng mảnh, không lấy cả store --------------------- */

export const useIsAuthenticated = () => useAuthStore((s) => s.session !== null);
export const useAuthHydrated = () => useAuthStore((s) => s.hydrated);
export const useSessionEmail = () => useAuthStore((s) => s.session?.email ?? null);
