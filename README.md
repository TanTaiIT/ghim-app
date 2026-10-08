# Ghim — app điện thoại (bản làm lại)

App React Native cho sàn rao vặt Ghim, nối vào backend `../ghim-server`. Dựng ngày 08/10/2026 trên
**Expo SDK 57** · React Native 0.86 · React 19.2 (React Compiler bật) · **expo-router** 57 (typed routes) ·
**TanStack Query** v5 · **Zustand** 5 · **Reanimated** 4 · TypeScript 6 strict · oxlint + Prettier · jest-expo.

Rule cho người và agent: `AGENTS.md` (invariants) → `docs/conventions/conventions.hub.md` → ≤1 file convention.
Bộ rule kế thừa từ `docs/VueSer` ("Ghim (VueRoute)"), giữ nguyên số HARD rule.

---

## 1. Chạy lần đầu

```bash
npm install
cp .env.example .env         # EXPO_PUBLIC_API_URL — máy thật dùng IP LAN của máy chạy ghim-server
npx expo start -c --go       # quét QR bằng Expo Go; bỏ --go khi đã có development build
```

Cần Node 24 (`.nvmrc`). App hiện chỉ dùng module có sẵn trong **Expo Go** nên chạy được ngay bằng Expo Go;
`expo-dev-client` đã cài sẵn cho lúc thêm module native (push, kho ảnh): khi đó
`eas build --profile development` rồi `npx expo start --dev-client`.

Backend: `cd ../ghim-server && pnpm dev` (cổng 3100). Màn Bảng tin gọi `/health/ready` để cho thấy đường ống
app → SDK → backend → Postgres đang thông.

## 2. Lệnh

| Lệnh                              | Làm gì                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run check`                   | typecheck → lint → format:check → test — chạy trước khi báo xong                                  |
| `npm run typecheck`               | `tsc --noEmit`                                                                                    |
| `npm run lint` / `lint:fix`       | oxlint theo `.oxlintrc.jsonc`                                                                     |
| `npm run format` / `format:check` | Prettier                                                                                          |
| `npm test` / `test:watch`         | jest-expo + Testing Library, test cạnh file (`x.test.ts`)                                         |
| `npm run api:sync`                | Sinh lại `src/api/generated/**` từ `http://localhost:3100/docs/json` (ghim-server phải đang chạy) |
| `npm run doctor`                  | `expo-doctor`: phiên bản gói lệch SDK, cấu hình sai                                               |
| `npm run fix`                     | `expo install --fix`                                                                              |

## 3. Cấu trúc

```text
app/                    routes (expo-router) — chỉ route + layout, export default
  _layout.tsx           provider, font, splash, Stack.Protected (guard đăng nhập)
  index.tsx             → /(tabs)/home
  login.tsx             chỉ khách thấy
  (tabs)/home.tsx       bảng tin (khách xem được)
  (tabs)/profile.tsx    cần phiên → GuestGate khi là khách
src/
  api/http.ts           base URL, token, ApiError, createClientConfig (hey-api)
  api/client.ts         gọi SDK + unwrap + map wire → domain
  api/generated/        SDK sinh, không sửa tay
  queries/keys.ts       key factory `qk`
  queries/*.ts          hook TanStack theo domain
  stores/auth.ts        phiên đăng nhập, SecureStore
  components/ui.tsx     primitive nhỏ; file PascalCase cho component có state
  theme/index.ts        C · F · R · S · shadow · G
```

Chiều phụ thuộc một chiều: `app → components → queries → api → theme`, `stores` là lá. Chi tiết: `AGENTS.md`.

## 4. Backend và SDK

- `src/api/generated/**` sinh bằng hey-api từ OpenAPI do ghim-server phục vụ ở `/docs/json` (dev). Backend thêm
  endpoint → `npm run api:sync` → thêm hàm ở `src/api/client.ts` đi qua `unwrap()`.
- Vỏ response: `{ success: true, data }` hoặc `{ success: false, error: { code, message, details } }`. `unwrap`
  ném `ApiError(code, message, status)`; màn hình toast `e.message`, rẽ nhánh theo `e.code`.
- Endpoint cần đăng nhập mang `bearerAuth`; token được `useSyncAccessToken` đẩy từ store xuống `http.ts`.

## 5. Build và phát hành

`eas.json` có ba profile: `development` (dev client, APK), `preview` (APK nội bộ), `production`. Lần đầu:
`npm i -g eas-cli && eas login && eas build --profile development --platform android`.
Không có secret nào trong repo (HARD#19); credential push/ảnh đặt ở EAS secrets và backend.

## 6. Việc tiếp theo

- Đăng nhập, đăng ký, xác nhận email: nối khi ghim-server archive `add-identity` (`src/queries/auth.ts` thêm
  `useLogin`, `app/login.tsx` gọi mutation; refresh token đơn lượt ở `http.ts`).
- Ảnh: chờ `add-media` (chữ ký do backend cấp). Push, realtime: chưa chọn thư viện ở backend.
- Khi có route cần đăng nhập đầu tiên: đặt `<Stack.Screen>` vào khối `guard={isAuthenticated}` của
  `app/_layout.tsx` (HARD#17).
