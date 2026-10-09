# folder.convention

SoT cho: tập layer, file-based routing, đặt tên file/thư mục, alias & import, hình dạng export,
chiều phụ thuộc. **Đọc file này TRƯỚC khi tạo / đổi tên / di chuyển bất kỳ file hay thư mục nào** (HARD#15).

---

## 1. Tập layer đóng

Chỉ tồn tại hai gốc, không thêm gốc thứ ba:

```text
app/            — routes. expo-router resolve theo file path. KHÔNG chứa gì ngoài route + layout.
src/
├── api/        — http.ts (base URL, token, ApiError) · client.ts (gọi SDK, unwrap, mapper, domain type)
│                 · generated/ (sinh) · mock*.ts (dữ liệu mẫu tới khi backend có endpoint — xem README §4)
├── queries/    — TanStack hook + key factory (keys.ts)
├── stores/     — Zustand store cho client state sống lâu hơn màn hình
├── components/ — UI dùng lại, không gắn với một route cụ thể
├── theme/      — token màu / font / bóng / bo góc / khoảng cách
└── utils/      — hàm thuần dùng chung (định dạng giá, thời gian) — lá, không import layer nào
```

Tên layer con **không được lặp lại lồng nhau**: cấm `src/components/components/`, `src/api/api/`.

Muốn thêm layer mới (`utils/`, `hooks/`, `constants/`…): chỉ khi có **≥2 call-site thật** đã tồn tại.
Một helper dùng một chỗ thì để ngay trong file dùng nó, đừng promote lên `utils/`.

---

## 2. `app/**` — file-based routing

| Loại                      | Quy tắc đặt tên                 | Đang có                                     |
| ------------------------- | ------------------------------- | ------------------------------------------- |
| Route thường              | lowercase, chính là URL segment | `login.tsx`, `(tabs)/home.tsx`              |
| Route động                | `[param].tsx`                   | (chưa có) `listing/[id].tsx`                |
| Layout                    | `_layout.tsx`                   | `app/_layout.tsx`, `app/(tabs)/_layout.tsx` |
| Group không ảnh hưởng URL | `(name)/`                       | `app/(tabs)/`                               |
| Entry redirect            | `index.tsx`                     | `app/index.tsx` → redirect `/(tabs)/home`   |

Quy tắc:

- **Một file = một route.** Không đặt file phụ trợ (`helpers.ts`, `types.ts`, sub-component, test) trong
  `app/**` — expo-router coi nó là route. Thứ dùng lại đi vào `src/components/**`.
- Route file `export default function <TênMànHình>()` — PascalCase mô tả màn hình, không cần trùng tên file.
- Typed routes đang bật (`experiments.typedRoutes`): `router.push('/listing/1')` sai đường là lỗi `tsc` **trên máy
  đã chạy `expo start`** — type sinh vào `.expo/types/router.d.ts` lúc đó (gitignore). Chưa có file đó thì `Href`
  rộng hơn và `tsc` vẫn qua, nên CI không bắt được sai đường; đây là kiểm tra cục bộ, chạy `expo start` trước
  khi báo xong một route mới.
- Route mới có tab → thêm file trong `app/(tabs)/` **và** một dòng `TABS` trong `src/components/TabBar.tsx`
  **và** `<Tabs.Screen>` trong `app/(tabs)/_layout.tsx`.
- Route cần option riêng (modal, animation) → khai `<Stack.Screen name="…" options={…}>` trong `app/_layout.tsx`,
  không đặt option rải rác trong từng màn.

---

## 3. `src/**` — đặt tên file

| Thư mục       | Casing     | Nội dung một file                                          |
| ------------- | ---------- | ---------------------------------------------------------- |
| `components/` | PascalCase | Một component (hoặc một cụm Provider + hook của nó)        |
| `queries/`    | lowercase  | Hook theo domain (`listings.ts`, `auth.ts`) + `keys.ts`    |
| `stores/`     | lowercase  | Một store một domain (`auth.ts`)                           |
| `api/`        | lowercase  | `http.ts`, `client.ts`, `generated/` (sinh, không sửa tay) |
| `theme/`      | lowercase  | `index.ts`                                                 |
| `utils/`      | lowercase  | Hàm thuần theo chủ đề (`format.ts`)                        |

- Tên file PascalCase **là tên tính năng**, không bắt buộc là tên export duy nhất: `Toast.tsx` export
  `ToastProvider` + `useToast`.
- Ngoại lệ có chủ đích: `ui.tsx` là **barrel các primitive nhỏ** (`PinButton`, `OutlineButton`, `GhostButton`,
  `IconButton`, `Tag`, `Price`, `SectionTitle`, `SafetyNote`, `ScreenHeader`, `EmptyState`, `Loading`), đặt lowercase để phân biệt với file-một-component. Không tạo barrel
  thứ hai; primitive mới vào chính `ui.tsx`.
- Tách khỏi `ui.tsx` khi component đạt **một trong hai**: cần state/animation riêng đáng kể, hoặc >60 dòng.
- Test đặt **cạnh** file nó kiểm, cùng tên, đuôi `.test.ts(x)`: `http.test.ts` bên `http.ts`. Không có
  thư mục `__tests__`.

---

## 4. Export shape (HARD#1)

- `app/**`: **phải** có `export default`. Đây là hợp đồng của expo-router. `ErrorBoundary` là named export
  phụ được expo-router nhận ra — ngoại lệ hợp lệ duy nhất.
- `src/**`: **chỉ** named export. Hiện có 0 `export default` trong `src/` — giữ nguyên con số đó.
- Hệ quả cho deadcode review: mọi default export dưới `app/**` là route, **không có importer nào cả** —
  đừng bao giờ báo nó là dead code.

---

## 5. Import & alias

```jsonc
// tsconfig.json
"paths": { "@/*": ["./src/*"] }
```

| Tình huống       | Viết                                  | Ghi chú                |
| ---------------- | ------------------------------------- | ---------------------- |
| Khác layer       | `import { qk } from '@/queries/keys'` | Bắt buộc               |
| Cùng thư mục     | `import { qk } from './keys'`         | Hợp lệ                 |
| Đi ngược lên cha | `../anything`                         | **Cấm** — oxlint error |

Thứ tự import (Prettier không sắp import — làm tay):

1. `react`
2. `react-native`
3. Thư viện ngoài (`expo-router`, `expo-*`, `@tanstack/react-query`, `react-native-reanimated`…)
4. Nội bộ theo `@/` — components → queries → api → stores → theme

Jest dùng alias giống hệt qua `moduleNameMapper` trong `jest.config.js`; thêm alias thì đổi cả hai chỗ.

---

## 6. Chiều phụ thuộc — một chiều, không ngoại lệ

```text
app/** → components/** → queries/** → api/** → theme
                             ↓
                         stores/**
```

- `theme` và `stores` là lá: chỉ được import thư viện ngoài. Import layer khác trong repo = vi phạm.
- `components/**` được đọc query hook, nhưng **không được gọi mutation**. Mutation chỉ khởi phát từ `app/**`.
- `queries/**` được đọc/ghi store (`queries/auth.ts` dùng `useAuthStore.getState()`) và đẩy token xuống
  `api/http.ts`; chiều ngược lại thì cấm.
- Cấm `api/**` biết tới `queries`, `stores`, `components`, hay `app`. `api/http.ts` vì thế nhận token qua
  `setHttpAccessToken`, không tự đọc store.

---

## 7. Không thuộc về đâu cả

Không tạo mới: `docs/` con khác, `openspec/`, delta-spec, hay file convention thứ bảy — bộ này là đủ.
Không tạo `index.ts` barrel cho `components/` hay `queries/`: import trực tiếp theo đường dẫn rõ ràng.
Spec nghiệp vụ sống ở `../ghim-server/openspec/` và TK của backend; app không có bản sao.
