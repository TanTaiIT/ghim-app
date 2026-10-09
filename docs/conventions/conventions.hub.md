# Conventions Hub — Ghim app

Index **duy nhất** cho convention của repo này. Quy tắc dùng: tra ở đây trước; chỉ mở **≤1** file
`.convention.md` khi thực sự cần chi tiết để implement. Không bao giờ bulk-read cả thư mục.

| File                       | Sở hữu                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `folder.convention.md`     | Tập layer, file-based routing, đặt tên file, alias/import, export shape, chiều phụ thuộc |
| `typescript.convention.md` | strict mode, props typing, `as const`, type import, parse route param, cấm `any`         |
| `component.convention.md`  | Component & hook RN: props shape, state, Reanimated, list, safe-area, LOC caps           |
| `query.convention.md`      | `src/api/**` + `src/queries/**`: SDK sinh, `unwrap`, `qk`, query/mutation, bề mặt lỗi    |
| `store.convention.md`      | `src/stores/**` (Zustand): ranh giới với Query, selector, persist, auth & route guard    |
| `style.convention.md`      | Theme token `C`/`F`/`R`/`S`/`shadow`/`G`, `StyleSheet.create`, style động                |

---

## Must-Know Router — câu hỏi → chỗ trả lời

| Đang làm gì                                       | Đọc                     |
| ------------------------------------------------- | ----------------------- |
| Thêm màn hình mới / route mới                     | folder                  |
| Đặt tên file, tạo thư mục, di chuyển file         | folder                  |
| Thêm data hook, sửa cache, optimistic update      | query                   |
| Backend thêm endpoint → sinh lại SDK, thêm hàm    | query §1                |
| Upload ảnh, xử lý secret / khoá API               | query §9                |
| Đăng nhập/đăng xuất, chặn route, state dùng chung | store                   |
| Phân vân state để ở đâu (Query / store / local)   | store §1                |
| Viết component dùng chung, tách component         | component               |
| Animation (Reanimated), gesture, danh sách dài    | component               |
| Màu, font, shadow, spacing, style động            | style                   |
| Type cho props / route param / domain model       | typescript              |
| Hiển thị lỗi, toast, empty state, loading         | query §5 + component §6 |
| Viết test cho calc / component / hook             | component §11           |

---

## Trả lời nhanh (không cần mở file nào)

- Alias: `@/*` → `./src/*`. Cross-layer dùng `@/`, cùng thư mục dùng `./`. `../` bị oxlint chặn.
- `export default` chỉ có ở `app/**`. `src/**` luôn named export.
- Route file đặt tên lowercase theo URL segment; component trong `src/components/**` đặt PascalCase.
- Query key: luôn `qk.xxx()` từ `src/queries/keys.ts`.
- State: server → TanStack · sống lâu hơn màn hình → Zustand `src/stores/**` · còn lại → `useState`.
- Route mới cần đăng nhập → thêm `<Stack.Screen>` vào khối `guard={isAuthenticated}` trong `app/_layout.tsx`.
- Màu: `C.brand`, `C.ink`… Font: `F.uiBold`… Bo góc `R.md`, khoảng cách `S.lg`, bóng `shadow`/`shadowLift`.
- Lỗi hiện ra bằng `useToast()` từ `@/components/Toast`; lỗi query thì `EmptyState`, không toast.
- **Không secret nào được nằm trong repo này** — kể cả `EXPO_PUBLIC_*`, thứ đó vào bundle.
- Dữ liệu mẫu: `mockApi` (`src/api/mock.ts`) chỉ được gọi từ `src/queries/**`; nối backend thì đổi sang `api`.
- SDK: `src/api/generated/**` không sửa tay; `npm run api:sync` khi `ghim-server` đang chạy ở cổng 3100.
- Base URL của BE: `EXPO_PUBLIC_API_URL` trong `.env` (xem `.env.example`) — máy thật phải dùng IP LAN.
- Comment tiếng Việt, WHY-only. React Compiler đang bật: không `useMemo`/`useCallback` phòng xa.
- Verify: `npm run check` (cwd = repo này).
