# typescript.convention

SoT cho: strict mode, cách type props, `as const`, type-only import, parse route param, cấm `any`.
Gate: `npm run typecheck` (`tsc --noEmit`, baseline sạch) + `npm run lint`.

---

## 1. Nền

`tsconfig.json` extends `expo/tsconfig.base`, bật `strict` và `noUncheckedIndexedAccess`. Không nới lỏng: cấm
thêm `strictNullChecks: false`, `noImplicitAny: false`, hay `skipLibCheck` để né lỗi thật.

`noUncheckedIndexedAccess` nghĩa là `arr[i]` và `record[key]` là `T | undefined`. Viết fallback có nghĩa ngay
tại chỗ (`TILTS[i % TILTS.length] ?? 0`, `ICONS[route.name] ?? 'ellipse'`), đừng `!`.

`jsx` đến từ `expo/tsconfig.base` **bên trong `node_modules`**. Typecheck bỗng tuôn ra hàng loạt `ts(17004)` là
thiếu dependency chứ không phải hỏng type — chạy `npm install` trước khi sửa gì.

---

## 2. Cấm tuyệt đối

| Cấm                                   | Thay bằng                                                           |
| ------------------------------------- | ------------------------------------------------------------------- |
| `any` (oxlint **error**)              | `unknown` + narrow, hoặc generic                                    |
| `@ts-ignore` / `@ts-expect-error`     | Sửa type. Nếu bất khả kháng: `@ts-expect-error` + comment lý do     |
| `import { type X }` lẫn value import  | `import type { X } from …` riêng (oxlint `consistent-type-imports`) |
| Non-null `!` để né `strictNullChecks` | Optional chain + fallback: `savedIds?.includes(id) ?? false`        |

---

## 3. Type props của component

**Inline object type ngay tại tham số** là hình dạng chuẩn — không tách `type XxxProps` riêng trừ khi type đó được
export hoặc dùng lại:

```ts
export function GuestGate({ text }: { text: string }) { … }
```

Mở rộng props của primitive RN thì giao với type gốc, không chép lại field:

```ts
export function Field({ label, style, ...props }: TextInputProps & { label: string }) { … }
```

Props tuỳ chọn có default → khai `?` rồi default ở destructure (`disabled = false`), **không** `defaultProps`.
Callback prop luôn có kiểu hàm tường minh: `onPress: () => void`, không `Function`.

---

## 4. Domain type

Kiểu wire đến từ `src/api/generated/types.gen.ts` (sinh từ OpenAPI). Chúng **không rò** lên `queries/` hay
`app/`: `client.ts` map sang domain type khai trong chính `client.ts` (hoặc `api/db.ts` khi đủ lớn), và mọi layer
khác `import type` từ đó.

- Union literal cho trạng thái hữu hạn: `status: 'live' | 'held'`. Không `string` cho tập đóng, không runtime `enum`.
- Tuple readonly khi độ dài cố định: `export type Grad = readonly [string, string]`.
- Id của backend là uuid v7 dạng chuỗi; không ép sang số.

---

## 5. `as const` — dùng khi nào

Dùng cho bảng tra cứu và tập token cần literal type:

```ts
export const C  = { ink: '#17181C', … } as const;                      // theme/index.ts
export const qk = { health: () => ['health'] as const };              // queries/keys.ts
```

`as const` trên return của `qk.*` là bắt buộc — TanStack cần key là readonly tuple để suy luận đúng.
Mảng thuần dữ liệu hiển thị (`TILTS`) **không** cần `as const`. Bảng tra theo khoá union thì khai
`Record<K, V>` tường minh (`ICONS: Record<string, keyof typeof Ionicons.glyphMap>`).

---

## 6. Route param

Param từ expo-router **luôn là string**. Type tại nguồn, giữ nguyên chuỗi vì id là uuid:

```ts
const { id } = useLocalSearchParams<{ id: string }>();
```

Query nhận id **phải** có `enabled: Boolean(id)` — không gửi `undefined`/chuỗi rỗng xuống SDK.

---

## 7. Generic & narrowing

- Generic ngắn gọn, chỉ khi thật sự đa hình. Dấu phẩy sau `<T,>` là bắt buộc trong file `.tsx`.
- Mutation context: để TanStack suy từ giá trị `onMutate` trả về (`return { prev }` → `ctx?.prev`).
- Type param của cache helper đặt ở generic: `qc.getQueryData<Listing[]>(qk.myListings())`.
- Biến không dùng phải prefix `_` — oxlint chỉ tha pattern `^_`.

---

## 8. Type assertion

Assertion là lựa chọn cuối. Hiện chỉ có một loại được chấp nhận:

```ts
export const shadow = Platform.select({ ios: {…}, default: { elevation: 3 } }) as object;
```

`Platform.select` trả `T | undefined` dù nhánh `default` luôn có. **Deviation đã biết** — không nhân bản sang chỗ
khác, và đừng đề xuất "sửa cho sạch".

---

## 9. Comment & JSDoc

- Tiếng Việt, WHY-only. Nêu lý do hoặc nguồn gốc, không mô tả lại code.
- JSDoc một dòng cho export có ý nghĩa nghiệp vụ. Không JSDoc cho hook `useQuery` thuần một dòng.
- React Compiler bật: không `useMemo`/`useCallback`/`React.memo` phòng xa; dùng khi có số đo hoặc khi API bên
  ngoài đòi reference ổn định, và ghi WHY.
