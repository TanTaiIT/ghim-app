# component.convention

SoT cho: component & hook React Native — hình dạng props, state, Reanimated, danh sách, safe-area,
trạng thái rỗng/đang tải, LOC caps, test.

---

## 1. Thứ tự quyết định khi cần một mảnh UI

1. Có sẵn trong `@/components/ui` chưa? (`PinButton`, `GhostButton`, `Field`, `ScreenHeader`, `EmptyState`,
   `Loading`) hoặc component riêng (`Toast`, `GuestGate`, `ErrorScreen`).
2. Chưa có nhưng ≥2 màn sẽ dùng → thêm vào `ui.tsx` (nếu nhỏ) hoặc file PascalCase riêng (nếu có state/animation).
3. Chỉ một màn dùng → viết inline ngay trong route.

**Không dựng raw `<TextInput>`/`<Pressable>` cho nút và ô nhập khi đã có primitive tương ứng.**

---

## 2. Khung một component

```tsx
import { StyleSheet, View } from 'react-native';
// … external, rồi @/ nội bộ

/** WHY-only, tiếng Việt, nếu cần */
const TILTS = [-2, 1.6, 1, -1.4];              // hằng module — ngoài component, viết HOA

export function NoteCard({ item, index, onPress }: { … }) {
  // hooks → derived value → handler → return JSX
}

const styles = StyleSheet.create({ … });       // luôn ở cuối file
```

- Không import React chỉ để có JSX (automatic runtime). Import hook cụ thể: `import { useState } from 'react'`.
- Hằng số dùng lại đặt **ngoài** component ở đầu file, SCREAMING_SNAKE.
- Không magic number lặp lại tại nhiều chỗ trong JSX — đặt tên thành hằng module.
- React Compiler đang bật: không `React.memo`/`useCallback`/`useMemo` phòng xa. Compiler tự memo; viết tay chỉ
  khi có số đo cho thấy cần, kèm comment WHY.

---

## 3. State

- `useState` cục bộ cho UI state (form, filter, focus, toggle). Không đưa state server vào `useState`.
- Ba nơi chứa state: server → TanStack Query · sống lâu hơn màn hình → Zustand (`store.convention.md`) · còn lại
  → `useState`. **Mặc định là `useState`** — chỉ lên store khi bị ≥2 màn hình đọc và phải sống qua unmount.
- Context chỉ cho component vừa giữ state vừa render: hiện đúng một cái, `ToastProvider`.
- Form nhiều field gom thành một object state + setter phái sinh:

```ts
const [form, setForm] = useState({ email: '', password: '' });
const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
```

- `useEffect` chỉ cho side-effect có lý do rõ: debounce, đồng bộ form từ server data, ẩn splash. Effect có timer
  **phải** cleanup. Cấm dùng `useEffect` để fetch — đó là việc của `useQuery`.

---

## 4. Reanimated 4

- Shared value + animated style khai ngay đầu component, đặt tên theo hiệu ứng (`press`, `scale`), style hậu tố
  `Style`.
- Animation vào-màn dùng preset entering, stagger theo index:
  `entering={FadeInDown.delay(index * 90).duration(420).springify().damping(16)}`.
- Animation do tương tác dùng `withSpring`/`withTiming` trong handler, **không** trong render.
- Feedback nhấn đơn giản (scale/opacity) dùng luôn callback style của `Pressable`, không cần Reanimated.
- `react-native-worklets/plugin` phải là plugin **cuối cùng** trong `babel.config.js` (HARD#13).

---

## 5. Danh sách & scroll

- Danh sách dữ liệu → `FlatList` (hoặc `FlashList` khi có số đo cần), `keyExtractor={(item) => item.id}`.
  **Không** `.map()` trong `ScrollView` cho dữ liệu từ server.
- Header của màn cuộn được → `ListHeaderComponent` của chính `FlatList`, không lồng `FlatList` trong `ScrollView`.
- Màn có input trong vùng cuộn → `keyboardShouldPersistTaps="handled"` +
  `KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}`.
- Pull-to-refresh nối thẳng vào TanStack: `refreshing={isRefetching} onRefresh={refetch}`.
- Ảnh từ mạng dùng `expo-image` (`<Image>` của `expo-image`, có cache và `contentFit`), không `Image` của RN.

---

## 6. Loading / Empty / Error

Một màn chỉ có ba nhánh, dùng đúng primitive có sẵn:

```tsx
if (isLoading || !listing) return <Loading />;                          // chặn cả màn
ListEmptyComponent={isLoading ? <Loading /> : <EmptyState icon="📌" text="…" />}
```

- Lỗi của query **không** toast (`query.convention.md` §5) — rơi về `EmptyState`.
- Nút đang submit: khoá bằng `disabled={mutation.isPending}` hoặc `loading={mutation.isPending}` của `PinButton`,
  không tự dựng cờ `useState`.

---

## 7. Safe area & nền

- Màn thường: `<SafeAreaView style={styles.screen} edges={['top', 'bottom']}>` từ
  `react-native-safe-area-context` (không phải bản của `react-native`). Màn trong tab chỉ `edges={['top']}`.
- Màn có `FlatList` tràn viền: `useSafeAreaInsets()` rồi cộng vào `contentContainerStyle.paddingTop`.
- Thanh cố định đáy: `paddingBottom: insets.bottom || S.lg`.
- Android `edgeToEdgeEnabled` đang bật: không giả định thanh điều hướng có nền riêng.

---

## 8. Điều hướng

- `const router = useRouter()`, `router.push('/listing/…')` đi tiếp, `router.replace()` sau khi hoàn tất một luồng.
- Back phải có fallback vì route có thể mở bằng deep link — đã đóng gói trong `ScreenHeader`, dùng lại.
- Màn cần đăng nhập mở từ chỗ khách xem được → render `<GuestGate>` thay nội dung, không `router.replace('/login')`
  trong effect.

---

## 9. LOC caps (HARD#11)

Đo bằng **tổng số dòng** của file (`wc -l`).

| Loại                        | Cap |
| --------------------------- | --- |
| Route / màn hình (`app/**`) | 250 |
| Component dùng chung        | 350 |
| Query module                | 200 |

Vượt cap → tách **theo vùng UI có state riêng**, không tách máy móc cho đủ số dòng. Chưa có file nào vượt cap.

---

## 10. Nhắc lại ranh giới

- Component trong `src/components/**` được đọc query hook, **không** được gọi mutation (`folder` §6).
- Component nhận dữ liệu qua props khi caller đã có sẵn; tự gọi hook chỉ khi dữ liệu độc lập với caller.

---

## 11. Test (jest-expo + Testing Library)

- Test cạnh file, cùng tên, đuôi `.test.ts(x)`. `npm test` chạy không cần máy ảo.
- Ba loại, chọn đúng loại: hàm thuần (`calc`, mapper trong `client.ts`) → test input/output; component → render +
  `fireEvent`/`screen.getByRole`, kiểm hành vi người dùng thấy, không kiểm style; hook query → `renderHook` với
  `QueryClientProvider` và SDK giả (`jest.mock('@/api/client')`).
- Không snapshot: nó đỏ vì mọi thay đổi và không nói gì khi hành vi sai.
- Truy vấn theo vai trò/nhãn (`getByRole('button')`, `getByPlaceholderText`) trước, `testID` là lựa chọn cuối.
