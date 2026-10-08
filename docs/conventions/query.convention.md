# query.convention

SoT cho: `src/api/**` + `src/queries/**` — SDK sinh từ OpenAPI, `unwrap`, key factory, read/write split,
optimistic update, bề mặt lỗi. Đây là layer chịu nhiều HARD rule nhất (#2 → #6, #19, #20).

---

## 1. Phân vai các file

| File                   | Chịu trách nhiệm                                                                | Cấm                                 |
| ---------------------- | ------------------------------------------------------------------------------- | ----------------------------------- |
| `src/api/http.ts`      | Base URL, Bearer token (`setHttpAccessToken`), `ApiError`, `createClientConfig` | Import `stores/**`                  |
| `src/api/generated/**` | Output của `npm run api:sync` — **không sửa tay**, oxlint và Prettier đã ignore | Bị import ngoài `client.ts`         |
| `src/api/client.ts`    | Mọi hàm truy cập dữ liệu: gọi SDK, `unwrap()`, map wire → domain, domain type   | Import React / TanStack / component |
| `src/queries/*.ts`     | Hook `useQuery`/`useMutation`, quản lý cache                                    | Chứa business rule của màn hình     |

**SDK đến từ backend thật**: `npm run api:sync` đọc `http://localhost:3100/docs/json` của `ghim-server` đang chạy
(tài liệu sinh từ chính schema Zod của nó, nên không có bản tĩnh nào để lệch). Backend thêm endpoint → chạy lại
api:sync → thêm hàm trong `client.ts`. Một hàm mới trong `client.ts` mà không gọi SDK là dấu hiệu sai.

SDK **không throw**, nó trả `{ data, error, response }`. `unwrap()` trong `client.ts` là chỗ duy nhất đổi hai
nhánh thành kết quả hoặc `ApiError` (có `code`, `message` tiếng Việt của server, `status`) — mọi hàm mới đi qua
nó, đừng đọc `res.error` ở call-site. Vỏ response của backend là `{ success: true, data }` hoặc
`{ success: false, error: { code, message, details } }`; `unwrap` bóc luôn `data`.

Endpoint cần đăng nhập có `security: [{ bearerAuth }]` trong OpenAPI → SDK tự gọi `auth()` của
`createClientConfig`. Gọi ẩn danh thì backend trả 401 và `unwrap` ném `ApiError('UNAUTHORIZED')`.

---

## 2. Query key — luôn qua `qk` (HARD#3)

Mọi key nằm trong `src/queries/keys.ts`. Call-site **không bao giờ** viết array literal cho `queryKey`.

```ts
queryKey: qk.listing(id); // ✅
queryKey: ['listing', id]; // ❌
```

Ngoại lệ duy nhất: **invalidate theo prefix** dùng literal gốc để quét cả nhánh —
`qc.invalidateQueries({ queryKey: ['listings'] })`. Chỉ với prefix một phần tử đã có trong `keys.ts`.

Thêm key mới = thêm một hàm vào `qk`, kể cả key không tham số (`health: () => ['health'] as const`).

---

## 3. Read vs Write (HARD#5)

**Read → `useQuery`.** Query nhận param từ ngoài **bắt buộc** có `enabled` guard:

```ts
export function useListing(id: string) {
  return useQuery({
    queryKey: qk.listing(id),
    queryFn: () => api.getListing(id),
    enabled: Boolean(id),
  });
}
```

- `placeholderData: keepPreviousData` cho query **danh sách đổi filter liên tục**. Không dùng cho query detail.
- Query không tham số viết một dòng: `useQuery({ queryKey: qk.health(), queryFn: api.getHealth })`.
- Reactive param nằm ở **key**, không `useEffect` gọi `refetch()`.

**Write → `useMutation`.** `mutationFn` nhận đúng một argument; nhiều field thì gói object.

---

## 4. Optimistic update — bộ ba bắt buộc (HARD#4)

Có `onMutate` thì **phải** có đủ cả ba. Thiếu rollback = bug im lặng khi mạng lỗi.

```ts
onMutate: async (id) => {
  await qc.cancelQueries({ queryKey: qk.savedIds() });   // 1. chặn refetch đang bay đè lên
  const prev = qc.getQueryData<string[]>(qk.savedIds()) ?? [];
  qc.setQueryData<string[]>(qk.savedIds(), /* patch */);
  return { prev };                                        // 2. snapshot làm context
},
onError: (_e, _id, ctx) => {
  if (ctx?.prev) qc.setQueryData(qk.savedIds(), ctx.prev); // 3. rollback
},
onSettled: () => {
  qc.invalidateQueries({ queryKey: ['saved'] });           // 4. đồng bộ lại với nguồn thật
},
```

Mutation **không** optimistic thì chỉ cần `onSuccess`: `setQueryData` khi server trả về chính entity đó;
`invalidateQueries` khi mutation làm lệch các list khác. Đừng làm cả hai.

---

## 5. Một call, một bề mặt lỗi (HARD#6)

Toàn app có **đúng một** bề mặt lỗi cho người dùng: `useToast()` từ `@/components/Toast`.

- Xử lý lỗi ở **call-site**, qua option thứ hai của `mutate()` — không trong định nghĩa hook:

```ts
create.mutate(payload, {
  onSuccess: () => toast('Đã ghim tin lên bảng'),
  onError: (e: Error) => toast(e.message),
});
```

- **Cấm** `try/catch` nuốt lỗi rồi trả giá trị mặc định. **Cấm** hai bề mặt cho cùng một call.
- Lỗi của `useQuery` **không** toast. Query hỏng thì render `EmptyState`/`Loading`.
- Thông điệp lấy từ `e.message` (server đã soạn tiếng Việt hướng người dùng). Rẽ nhánh theo
  `e instanceof ApiError && e.code === 'ACCOUNT_LOCKED'` khi màn hình cần làm gì khác ngoài hiện câu.

---

## 6. `app/**` không được chứa business rule (HARD#2)

Route được phép: đọc param, giữ form state, gọi hook, điều hướng, chạy animation.
Route **không** được: gọi `api.*` trực tiếp, tự tính giá / trạng thái, tự dựng `queryKey`, tự `useQueryClient()`
để vá cache.

| Việc                                                 | Chỗ đúng         |
| ---------------------------------------------------- | ---------------- |
| Chuẩn hoá payload, map wire → domain                 | `client.ts`      |
| Patch cache, rollback, invalidate                    | `queries/*.ts`   |
| Debounce input, animation, điều hướng sau thành công | route (`app/**`) |

---

## 7. Cấu hình QueryClient

Default nằm một chỗ duy nhất, `app/_layout.tsx`: `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`.
Chỉ override tại hook khi có lý do cụ thể, kèm comment WHY.

---

## 8. LOC

Query module ≤200 dòng. Vượt thì tách theo **domain**, không theo read/write.

---

## 9. Upload ảnh & secret (HARD#19)

Luồng của backend mới (TK 25): **app tải thẳng lên kho ảnh bằng chữ ký do backend cấp theo người**; backend chỉ lưu
URL; ảnh mang nhãn "chưa xác nhận" tới khi tin lưu thành công. Capability này chưa có (`add-media`, đợt 2) — chưa
viết code upload nào trước đó, và không dựng tạm bằng unsigned preset.

**Cấm tuyệt đối mọi secret trong repo này**, kể cả qua `EXPO_PUBLIC_*`: biến đó vào bundle, mà bundle React Native
giải nén được. Khoá ký ảnh, khoá push, khoá dịch vụ ngoài đều nằm ở backend; app chỉ cầm token của phiên.

Quy tắc phụ khi `add-media` tới: nén trên máy trước khi gửi; component chọn ảnh chỉ trả `uri`, mutation do route
gọi (HARD#2); mỗi ảnh upload độc lập, lỗi hiện trên thumbnail (ngoại lệ hợp lệ của §5: vẫn một bề mặt, chỉ là
inline); nút gửi khoá khi còn ảnh đang tải.
