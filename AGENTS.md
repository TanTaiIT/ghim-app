# Ghim app (bản làm lại) — Agent Rules

Expo SDK 57 · React Native 0.86 · React 19.2 + React Compiler · expo-router 57 (typed routes) · TanStack Query v5 ·
Zustand 5 · Reanimated 4 · TS 6 strict · oxlint + Prettier · jest-expo. Backend: `../ghim-server` (Fastify + Prisma),
SDK sinh từ OpenAPI của nó.

Bộ rule kế thừa **nguyên số** từ `docs/VueSer/AGENTS.md` ("Ghim (VueRoute)"): comment trong code hai repo trích
dẫn theo số (`HARD#2`, `folder §6`), đổi số là biến chúng thành chỉ dẫn sai. Khác biệt với VueSer ghi ở mục
**Khác với VueSer** cuối file.

File này = **invariants only**. Chi tiết nằm ở `docs/conventions/*.convention.md`, dispatch qua
`conventions.hub.md`. Đừng chép lại chi tiết vào đây — sửa file SoT.

---

## HARD Rules — vi phạm = reject ngay

`SoT` = convention file giữ chi tiết (`—` = file này chính là SoT).
`Gate` = thứ bắt lỗi một cách cơ học. **`Gate —` nghĩa là review-only, tức là rule bạn phải thực sự thuộc.**

| #   | Invariant                                                                                                                                           | SoT        | Gate                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------- |
| 1   | `export default` **chỉ** trong `app/**` (expo-router resolve theo file path); `src/**` luôn named export                                            | folder     | —                      |
| 2   | Không gọi API / đặt business rule trong `app/**`; route compose hook từ `src/queries/**`                                                            | query      | —                      |
| 3   | Mọi query key qua factory `qk` (`src/queries/keys.ts`) — không array literal inline tại call-site                                                   | query      | —                      |
| 4   | Mutation có `onMutate` **bắt buộc** kèm rollback `onError` + invalidate `onSettled`/`onSuccess`                                                     | query      | —                      |
| 5   | `useQuery` cho read · `useMutation` cho write · query nhận param phải có `enabled` guard                                                            | query      | —                      |
| 6   | Một lần thất bại = **một** bề mặt lỗi, qua `useToast`. Cấm `catch` nuốt lỗi, cấm 2 surface/call-site                                                | query §5   | —                      |
| 7   | Cross-layer import dùng alias `@/`; `../` bị cấm; cùng thư mục dùng `./`                                                                            | folder     | oxlint                 |
| 8   | Màu / font / bóng / bo góc / khoảng cách lấy từ `@/theme` (`C`, `F`, `shadow`, `R`, `S`) — không hardcode tại call-site                             | style      | —                      |
| 9   | Không `any`; type-only import phải là `import type`; `noUncheckedIndexedAccess` bật, không tắt                                                      | typescript | oxlint + tsc           |
| 10  | Style tĩnh nằm trong `StyleSheet.create` cuối file; chỉ phần phụ thuộc state mới inline                                                             | style      | —                      |
| 11  | LOC caps (tổng dòng): route ≤250 · component chia sẻ ≤350 · query module ≤200                                                                       | component  | —                      |
| 12  | Comment WHY-only, **tiếng Việt** — không diễn giải lại WHAT                                                                                         | typescript | —                      |
| 13  | `react-native-worklets/plugin` phải là plugin **cuối cùng** trong `babel.config.js`                                                                 | —          | —                      |
| 14  | Không chạy `scripts/hooks/review-gate.mjs --write` của repo cha từ repo này                                                                         | —          | —                      |
| 15  | Tạo/đổi tên file hoặc thư mục → đọc `folder.convention.md` TRƯỚC                                                                                    | folder     | —                      |
| 16  | Server state ở TanStack · state sống lâu hơn màn hình ở Zustand · còn lại `useState`. Cấm nhân bản server state vào store                           | store      | —                      |
| 17  | Route cần đăng nhập **phải** khai `<Stack.Screen>` trong khối `guard={isAuthenticated}` của `app/_layout.tsx`                                       | store      | —                      |
| 18  | Đổi trạng thái auth thì **không** tự `router.replace` — để `Stack.Protected` điều hướng                                                             | store      | —                      |
| 19  | **Không secret trong repo này.** Bundle RN giải nén được: cấm khoá bên thứ ba, kể cả qua `EXPO_PUBLIC_*`. Upload ảnh chỉ bằng chữ ký do backend cấp | query §9   | —                      |
| 20  | `src/api/generated/**` là output của `npm run api:sync` — **không sửa tay**; mọi hàm trong `client.ts` phải gọi SDK đó và đi qua `unwrap()`         | query §1   | oxlint ignore + review |

---

Verify trước khi báo xong: `npm run check` (typecheck → lint → format:check → test). `oxlint` là devDependency
của chính repo này, không mượn từ repo cha.

Commit trong repo này dùng bypass đã ghi nhận để lý do nằm lại trong git history:
`[skip-review: nested repo, reviewed via /review-diff-rn]`.

---

## Kiến trúc — chiều phụ thuộc một chiều

```text
app/**  (routes, expo-router)
   ↓
src/components/**  ──┐
   ↓                 │
src/queries/**  ─────┤→  src/theme · src/stores · src/utils  (lá, chỉ import thư viện ngoài)
   ↓                 │
src/api/**  ─────────┘
```

- Mũi tên ngược = vi phạm. `src/api/**` không được biết tới `queries`/`stores`/`components`/`app`.
- `src/components/**` được phép đọc query, nhưng **mutation chỉ được gọi từ `app/**`**.
- `src/queries/**` được đọc/ghi store (`queries/auth.ts` đẩy token xuống `api/http.ts`); chiều ngược lại thì cấm.
- Dữ liệu đi qua backend thật: `client.ts` gọi SDK trong `src/api/generated/**` (sinh từ `/docs/json` của
  `ghim-server` đang chạy bằng `npm run api:sync`), `http.ts` giữ base URL + Bearer token + `ApiError`.
  Backend trả vỏ `{ success, data | error: { code, message, details } }`; `unwrap()` trong `client.ts` là chỗ
  duy nhất bóc vỏ và ném `ApiError`.
- **Dữ liệu mẫu**: phần backend chưa có endpoint (tin đăng, nhóm, chat, thông báo, đăng nhập) chạy trên
  `mockApi` (`src/api/mock.ts`) — cùng chữ ký và domain type với `api`. Nối backend = đổi `mockApi.x` → `api.x`
  trong `src/queries/**`; route và component không đổi. Không import `mock*.ts` từ ngoài `src/queries/**`.

---

## Convention Router — hub dispatch

1. Đọc `docs/conventions/conventions.hub.md` (index + Must-Know Router).
2. Tra cứu / việc nhỏ → dừng ở hub.
3. Implement cần chi tiết → đọc **≤1** file `.convention.md` khớp nhất.

Không có dòng nào khớp và hub không đủ → hỏi user trước khi đọc thêm convention file.

---

## Khác với VueSer

| Chủ đề         | VueSer (`docs/VueSer`)                          | Repo này                                                                     |
| -------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| Backend        | `docs/market` (Express + Mongo), id là ObjectId | `../ghim-server` (Fastify + Prisma), id là uuid v7, vỏ response `success`    |
| Upload ảnh     | Cloudinary unsigned preset                      | Chữ ký do backend cấp theo người (TK 25) — chưa có, chờ `add-media`          |
| Realtime       | socket.io                                       | Chưa chọn (ghim-server CLAUDE.md "(chưa có)")                                |
| Token          | `AsyncStorage` → di cư sang SecureStore         | SecureStore ngay từ đầu, không có bước di cư; web chỉ giữ phiên trong bộ nhớ |
| Lint/format    | oxlint mượn từ repo cha, không formatter        | oxlint + Prettier cục bộ; `format:check` nằm trong `check` và CI             |
| Test           | Không có                                        | jest-expo + Testing Library; test cạnh file (`x.test.ts`)                    |
| React Compiler | Tắt                                             | Bật (`experiments.reactCompiler`) → không `useMemo`/`useCallback` phòng xa   |
| Tab bar        | `TabBar` tự vẽ                                  | `TabBar` tự vẽ (`src/components/TabBar.tsx`): nút Đăng tin nổi giữa + badge  |
