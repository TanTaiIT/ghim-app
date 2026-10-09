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

Web: `npm run web` (cần `react-native-web` + `@expo/metro-runtime`, đã có trong dependencies). Trên web phiên đăng
nhập chỉ giữ trong bộ nhớ — tải lại trang là phải đăng nhập lại (xem `src/stores/auth.ts`).

Backend: `cd ../ghim-server && pnpm dev` (cổng 3100). Bản dev hiện một đèn nhỏ dưới hero trang chủ, gọi
`/health/ready` để cho thấy đường ống app → SDK → backend → Postgres đang thông.

**Dữ liệu mẫu.** Giao diện theo bộ UI "Chợ Đồ Cũ – bản làm mới" (10 màn + thanh điều hướng) đang chạy trên
`mockApi` vì backend chưa có tin đăng/nhóm/chat/thông báo/đăng nhập. Đăng nhập bằng email bất kỳ, mật khẩu từ 8
ký tự. Dữ liệu sống trong bộ nhớ: reload app là về lại bản gốc.

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
  _layout.tsx           provider, font Be Vietnam Pro, splash, Stack.Protected (guard đăng nhập)
  index.tsx             → /(tabs)/home
  login.tsx             chỉ khách thấy
  (tabs)/               Khám phá · Tin nhắn · Thông báo · Cá nhân (nút Đăng tin nổi giữa nằm ở TabBar)
  search.tsx            kết quả tìm kiếm + bộ lọc
  listing/[id].tsx      chi tiết tin
  group/[id].tsx        trang nhóm
  chat/[id].tsx         chat với người bán, trả giá (cần phiên)
  post/                 đăng tin 3 bước: index → details → preview (cần phiên)
  help.tsx              trợ giúp (cần phiên)
src/
  api/http.ts           base URL, token, ApiError, createClientConfig (hey-api)
  api/client.ts         gọi SDK + unwrap + domain type
  api/mock*.ts          dữ liệu mẫu + tranh minh hoạ SVG — xoá dần khi backend có endpoint
  api/generated/        SDK sinh, không sửa tay
  queries/keys.ts       key factory `qk`
  queries/*.ts          hook TanStack theo domain
  stores/auth.ts        phiên đăng nhập, SecureStore
  stores/draft.ts       nháp tin đang đăng (bộ nhớ)
  components/ui.tsx     primitive nhỏ; file PascalCase cho component có state hoặc khối lớn
  theme/index.ts        C · TONE · F · R · S · shadow · G
  utils/format.ts       định dạng giá, thời gian
```

Chiều phụ thuộc một chiều: `app → components → queries → api → theme`, `stores` và `utils` là lá. Chi tiết: `AGENTS.md`.

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

- Nối backend từng phần: endpoint ra đời → `npm run api:sync` → thêm hàm vào `api` (`client.ts`) trả đúng domain
  type đang dùng → trong `src/queries/**` đổi `mockApi.x` thành `api.x`. Hết chỗ gọi thì xoá `mock*.ts` và nhánh
  `svg` của `Picture`/`Photo`.
- Đăng nhập, đăng ký, xác nhận email: `useLogin` đã có, đang gọi `mockApi.login`; đổi sang `api.login` khi
  ghim-server archive `add-identity` (refresh token đơn lượt ở `http.ts`). Phiên mẫu lưu trong SecureStore mang
  token giả — đăng xuất một lần sau khi nối backend thật.
- Ảnh: chờ `add-media` (chữ ký do backend cấp). Push, realtime: chưa chọn thư viện ở backend.
- Chưa có trong thiết kế nên đang báo "sẽ có": trang người bán, sửa tin, đẩy tin (chờ giá gói), gọi trong app,
  gửi ảnh trong chat, cài đặt. Hộp thư (tab Tin nhắn) không có trong bộ UI gốc — dựng theo thẻ của các màn khác.
