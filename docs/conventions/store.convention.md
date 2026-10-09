# store.convention

SoT cho `src/stores/**` — Zustand. Ranh giới với TanStack Query, hình dạng một store, persist, route guard.

Thư viện: `zustand` + `expo-secure-store` cho persist phiên. Chọn Zustand vì store-là-hook, **không cần
Provider**, và đọc được ngoài React qua `getState()`.

---

## 1. Ranh giới — cái gì KHÔNG được vào store

Ba loại state, ba nơi ở:

| Loại state                                    | Ở đâu                     | Ví dụ                                |
| --------------------------------------------- | ------------------------- | ------------------------------------ |
| **Server state** — có nguồn sự thật ở backend | TanStack Query            | tin đăng, hồ sơ, hội thoại           |
| **Client state** — sống lâu hơn một màn hình  | Zustand (`src/stores/**`) | phiên đăng nhập                      |
| **UI state** — chết cùng màn hình             | `useState` tại chỗ        | text ô tìm kiếm, filter, focus, form |

**Cấm nhân bản server state vào store.** Nếu một giá trị lấy được bằng `useQuery`, nó không thuộc về store.
`useAuthStore` cố ý chỉ giữ `{ accountId, email, accessToken, refreshToken }`; hồ sơ đầy đủ đọc qua query.

**Cấm dựng store cho state chỉ một màn dùng.** Store mới chỉ khi state bị **≥2 màn hình đọc** và phải **sống qua
unmount**.

---

## 2. Hình dạng một store

File: `src/stores/<domain>.ts`. Xem `auth.ts`.

```ts
type AuthState = {
  session: Session | null;
  hydrated: boolean;
  signIn: (session: Session) => void;    // action nằm cùng chỗ với state nó sửa
  signOut: () => void;
};

export const useAuthStore = create<AuthState>()(persist((set) => ({ … }), { … }));
```

- Type state khai tường minh rồi truyền vào `create<T>()(...)` — **dấu ngoặc rỗng** `()` sau `create<T>` bắt buộc
  khi có middleware.
- Action đặt **trong** store, chỉ `set` — không gọi API, không điều hướng.
- Không `immer`, không `devtools`. State đang phẳng và nhỏ.

---

## 3. Selector — luôn đọc từng mảnh

**Cấm** `const { session, signIn } = useAuthStore()`. Export selector nguyên tử ở cuối file store:

```ts
export const useIsAuthenticated = () => useAuthStore((s) => s.session !== null);
export const useSessionEmail = () => useAuthStore((s) => s.session?.email ?? null);
```

Chỉ export selector **đang có call-site**. Selector phải trả về primitive hoặc reference ổn định — trả object mới
mỗi lần là re-render vô hạn ở Zustand v5.

Ngoài React thì `useAuthStore.getState()` / `useAuthStore.subscribe()` — xem `queries/auth.ts`.

---

## 4. Persist

```ts
{
  name: 'ghim-auth',
  storage: createJSONStorage(() => secureStorage),      // expo-secure-store
  partialize: (s) => ({ session: s.session }),
  onRehydrateStorage: () => (state) => { /* bật hydrated, vứt bản ghi thiếu field */ },
}
```

- `partialize` **bắt buộc** khi store có cờ runtime (`hydrated`).
- SecureStore là **bất đồng bộ** → phải có cờ `hydrated` và chặn render tới khi đọc xong (`ready` trong
  `app/_layout.tsx`), nếu không guard chạy với `session = null` và người dùng thấy màn login nháy lên.
- Callback `onRehydrateStorage` chạy **cả khi đọc đĩa lỗi** — luôn bật `hydrated` trong mọi nhánh.
- Token **chỉ** ở SecureStore. State không nhạy cảm cần persist (lịch sử tìm kiếm…) thì mới cân nhắc AsyncStorage,
  và là một store riêng.
- Web không có SecureStore (module rỗng) và không có kho tương đương: phiên trên web **chỉ ở bộ nhớ**, tải lại trang
  là đăng nhập lại. Không lùi về `localStorage` — script nào trên trang cũng đọc được refresh token ở đó.

---

## 5. Chiều phụ thuộc

```text
app/**  →  components/**  →  queries/**  →  api/**
                                 ↓
                             stores/**   (lá, chỉ import thư viện ngoài)
```

- `stores/**` **không** import `queries`, `api`, `components`, `app`. `auth.ts` tự khai `Session`.
- `queries/**` **được** đọc/ghi store — đó là chỗ phối hợp hai layer: `useSyncAccessToken` đẩy token xuống
  `api/http.ts`, `useSignOut` xoá phiên **và** `qc.clear()`.
- `app/**` và `components/**` gọi selector cho việc **đọc**; việc **ghi có kèm hệ quả** đi qua hook ở `queries/**`.

---

## 6. Auth & route guard

Guard dùng `<Stack.Protected guard={boolean}>` của expo-router, khai tập trung tại `app/_layout.tsx`. Không tự viết
`useEffect` + `router.replace` để chặn route.

- Khách xem được bảng tin (TK 6), nên `(tabs)` **không** nằm trong guard; phần cần phiên trong một tab render
  `<GuestGate>`.
- `login` nằm trong `guard={!isAuthenticated}`: đã có phiên thì route biến mất.
- **Route mới cần đăng nhập thì thêm `<Stack.Screen>` vào khối `guard={isAuthenticated}`** (HARD#17). Screen
  không khai trong khối đó vẫn mở được bằng deep link — tức không hề được bảo vệ.
- **Không tự điều hướng sau khi đổi trạng thái auth** (HARD#18). `signIn()`/`signOut()` đổi tập route khả dụng;
  `router.replace()` cùng tick sẽ chạy trên stack cũ. Để `Stack.Protected` lo.

---

## 7. Khi nào được thêm store thứ hai

Chỉ khi state thoả **cả ba**: không phải server state · bị ≥2 màn hình đọc · phải sống qua unmount.
Đạt đủ thì tạo `src/stores/<domain>.ts` mới — **không** nhồi thêm vào `auth.ts`. Một store một domain.
