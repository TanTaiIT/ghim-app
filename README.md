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

Cần Node 24 (`.nvmrc`). Mọi màn chạy được bằng **Expo Go**, trừ hai thứ cần bản build EAS (`eas build --profile
preview` hay `development` rồi `npx expo start --dev-client`): đăng nhập Google và thông báo đẩy. Trong Expo Go hai
thứ đó tự ẩn — nút Google không hiện, app không xin quyền thông báo (`src/api/google.ts`, `src/api/push.ts`).

Thông báo đẩy trên Android đi qua Firebase (FCM), cần hai thứ không nằm trong repo:

1. `google-services.json` (Firebase → Cài đặt dự án → app Android `vn.ahasoft.ghim`): đặt ở gốc repo cho máy dev, và
   đưa lên EAS thành biến file mà `app.config.ts` đọc:

   ```bash
   npx eas-cli env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json \
     --environment preview --visibility sensitive
   ```

2. Khoá tài khoản dịch vụ FCM V1 (Firebase → Tài khoản dịch vụ): upload ở expo.dev → Credentials → Android. Là
   secret — không vào repo, không qua chat.

Đăng nhập xong app hỏi quyền thông báo và gắn token vào phiên (`PUT /me/push-token`); tắt cho riêng máy ở Cài đặt ›
Thông báo. Bấm thông báo tin nhắn mở thẳng hội thoại, thông báo khác mở mục Thông báo.

Web: `npm run web` (cần `react-native-web` + `@expo/metro-runtime`, đã có trong dependencies). Trên web phiên đăng
nhập chỉ giữ trong bộ nhớ — tải lại trang là phải đăng nhập lại (xem `src/stores/auth.ts`).

Backend: `cd ../ghim-server && pnpm dev` (cổng 3100). Bản dev hiện một đèn nhỏ dưới hero trang chủ, gọi
`/health/ready` để cho thấy đường ống app → SDK → backend → Postgres đang thông.

**Không còn dữ liệu mẫu.** Giao diện theo bộ UI "Chợ Đồ Cũ – bản làm mới" (10 màn + thanh điều hướng); mọi màn —
đăng nhập, tin đăng, tin đã lưu, tìm kiếm đã lưu, đăng tin, tin của tôi, chat, thông báo, nhóm, trợ giúp và bàn vận
hành — gọi ghim-server thật.

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
  login.tsx             chỉ khách thấy; cùng khối: register, forgot-password, delete-account (xoá tài khoản không cần
                        đăng nhập)
  lock-appeal.tsx       khiếu nại tài khoản bị khoá (không cần phiên)
  (tabs)/               Khám phá · Tin nhắn · Thông báo · Cá nhân (nút Đăng tin nổi giữa nằm ở TabBar)
  search.tsx            kết quả tìm kiếm + bộ lọc
  listing/[id].tsx      chi tiết tin
  user/[id].tsx         trang người bán (khách xem được)
  group/[id].tsx        trang nhóm: vào theo chế độ, đơn chờ, mã nhóm, tắt tiếng, rời
  group/manage/[id]/    quản trị nhóm: hàng chờ duyệt tin của nhóm, gỡ tin khỏi nhóm, đơn xin vào, lời mời, mã, thành viên,
                        cấm, lớp, danh sách lớp, cài đặt, chuyển chủ, đóng nhóm, thông báo (chủ nhóm, điều hành viên; cần phiên)
  groups.tsx            nhóm của tôi: lời mời, nhóm đang ở, tìm nhóm, nhập mã (cần phiên)
  chat/[id].tsx         chat với người bán, trả giá (cần phiên)
  post/                 đăng tin 3 bước: index → details → preview (cần phiên)
  help.tsx              trợ giúp (cần phiên)
  reports.tsx           báo cáo mình đã gửi và kết quả (cần phiên)
  verify-id.tsx         nộp giấy tờ xác minh (CCCD, CMND, hộ chiếu) — tự nguyện, không ảnh hưởng gì (cần phiên)
  verify-email.tsx      nhập mã xác nhận email còn dở từ lúc đăng ký (cần phiên)
  saved-searches.tsx    tìm kiếm đã lưu (cần phiên)
  warnings.tsx          cảnh cáo của tôi: điểm vi phạm, khiếu nại (cần phiên)
  settings/             ảnh đại diện, khu vực, email, mật khẩu, thiết bị, người đã chặn, thông báo (cần phiên)
  ops/                  bàn vận hành cho master, staff (cần phiên master / staff; lối vào ở Cá nhân); ops/staff/ =
                        quyền staff (master); ops/category/ = máy duyệt theo danh mục (ngưỡng, luật riêng, lịch sử, từ
                        khoá) + soạn, phát hành mẫu thông tin (master; từ khoá cả staff của danh mục); rules, phrases,
                        whitelist, machine, review-stats = máy duyệt chung; config, domains, audit, jobs, articles,
                        strikes/ = quản trị hệ thống, quy định sàn (master); listing/ = gỡ / khôi phục tin;
                        group/owner.tsx = giao chủ nhóm (master); ops/lookup.tsx = tra mã tra cứu, gỡ đánh dấu thiết bị
                        (master, staff hỗ trợ)
src/
  api/http.ts           base URL, token, ApiError, createClientConfig (hey-api)
  api/client.ts         gọi SDK + unwrap + domain type
  api/ops.ts            như client.ts, cho bàn vận hành (/ops/*): duyệt tin, báo cáo, giấy tờ, nhóm, hỗ trợ, danh mục
  api/ops-screening.ts  như client.ts, cho cấu hình máy duyệt: cụm từ cấm, danh sách trắng ảnh, luật / ngưỡng / từ
                        khoá theo danh mục
  api/ops-admin.ts      như client.ts, cho quản trị hệ thống: gậy, quy định sàn, bảng con số, miền email, nhật ký,
                        việc nền, thống kê duyệt
  api/admin-labels.ts   chữ tiếng Việt cho mã của nhật ký vận hành và việc nền (không gọi SDK)
  api/group-manage.ts   như client.ts, cho chủ nhóm / điều hành viên (mọi route /groups/:id/* của quản trị)
  api/realtime.ts       socket.io, chỉ báo hiệu
  api/generated/        SDK sinh, không sửa tay
  queries/keys.ts       key factory `qk`
  queries/*.ts          hook TanStack theo domain
  stores/auth.ts        phiên đăng nhập, SecureStore
  stores/draft.ts       nháp tin đang đăng (bộ nhớ)
  components/ui.tsx     primitive nhỏ; file PascalCase cho component có state hoặc khối lớn
  theme/index.ts        C · TONE · F · R · S · shadow · G
  utils/format.ts       định dạng giá, thời gian
  utils/search-params.ts  bộ lọc tìm kiếm ↔ tham số đường dẫn
```

Chiều phụ thuộc một chiều: `app → components → queries → api → theme`, `stores` và `utils` là lá. Chi tiết: `AGENTS.md`.

## 4. Backend và SDK

- `src/api/generated/**` sinh bằng hey-api từ OpenAPI do ghim-server phục vụ ở `/docs/json` (dev). Backend thêm
  endpoint → `npm run api:sync` → thêm hàm ở `src/api/client.ts` (hay module api cùng mảng, xem §6) đi qua
  `unwrap()`.
- Vỏ response: `{ success: true, data }` hoặc `{ success: false, error: { code, message, details } }`. `unwrap`
  ném `ApiError(code, message, status)`; màn hình toast `e.message`, rẽ nhánh theo `e.code`.
- Endpoint cần đăng nhập mang `bearerAuth`; token được `useAuthBridge` (`src/queries/auth.ts`) đẩy từ store xuống
  `http.ts`.

## 5. Build và phát hành

`eas.json` có ba profile: `development` (dev client, APK), `preview` (APK nội bộ), `production`. Lần đầu:
`npm i -g eas-cli && eas login && eas build --profile development --platform android`.
Không có secret nào trong repo (HARD#19); credential push/ảnh đặt ở EAS secrets và backend.

## 6. Việc tiếp theo

- Endpoint mới: `npm run api:sync` (server chạy ở 3100) → thêm hàm vào `api` (`client.ts`), `opsApi` (`ops.ts`),
  `screeningApi` (`ops-screening.ts`), `adminApi` (`ops-admin.ts`) hay `groupManageApi` (`group-manage.ts`) trả
  domain type → hook trong `src/queries/**`. Sau mỗi lần sync, khởi động lại Metro với `--clear`.
- Push: chưa xin token Expo. Realtime: socket.io (`src/api/realtime.ts`), chỉ để báo hiệu — dữ liệu luôn tải lại qua
  HTTP.
- Chưa có: đẩy tin (báo "sẽ có" — chờ giá gói), gọi trong app ("Gọi người bán" mở trình gọi của máy). Chat gửi được tối
  đa 4 ảnh một tin (ghim-server `add-message-images`), tải với chủ là hội thoại lúc bấm gửi. Hộp thư (tab Tin nhắn) không
  có trong bộ UI gốc — dựng theo thẻ của các màn khác.
