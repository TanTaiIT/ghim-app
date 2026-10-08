# style.convention

SoT cho: theme token, `StyleSheet.create`, style động, spacing.

---

## 1. Token là nguồn duy nhất (HARD#8)

`src/theme/index.ts` giữ:

| Export                  | Dùng cho                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `C`                     | Màu: `ink`, `inkSoft`, `muted`, `paper`, `paperWarm`, `line`, `brand*`, `pin`, `amber`, `moss` |
| `F`                     | Tên font sau khi `useFonts` nạp: `ui`, `uiSemi`, `uiBold`, `uiBlack` (Manrope)                 |
| `R`                     | Bo góc: `sm` 8 · `md` 12 · `lg` 20 · `full`                                                    |
| `S`                     | Khoảng cách bội số 4: `xs` 4 → `xxl` 32                                                        |
| `shadow` / `shadowLift` | Đổ bóng cross-platform (`Platform.select`)                                                     |
| `G` / `Grad`            | Cặp màu cho `<LinearGradient>` (cần `expo-linear-gradient` khi dùng)                           |

Quy tắc:

- Màu mới **phải** thêm vào `C` rồi mới dùng. Không hardcode hex tại call-site. Ngoại lệ được tha: `'#fff'` cho
  chữ trên nền đậm.
- `pin` là màu cảnh báo (đỏ), không phải thương hiệu; thương hiệu là `brand*`. Chữ thương hiệu trên nền sáng dùng
  `brandTx` — `brand` quá nhạt để đọc.
- Font **luôn** qua `F.*`. Không `fontFamily: 'Manrope_700Bold'` trực tiếp; không `fontWeight` để giả đậm — RN cần
  đúng family đã nạp. Font mới: thêm vào `useFonts` ở `app/_layout.tsx` **và** vào `F` cùng lúc.
- Gradient **luôn** `G.*`. Chặng tắt dần là alpha-0 của chính màu đó, **không** `'transparent'` — Android nội suy
  qua sắc đen.
- Đổ bóng **luôn** `...shadow` / `...shadowLift`. Không tự viết `shadowColor + elevation` trừ khi bóng có màu riêng.

---

## 2. `StyleSheet.create` — vị trí và ranh giới

- Đúng **một** `const styles = StyleSheet.create({…})` mỗi file, đặt **cuối file**, sau mọi component.
- Style **tĩnh** vào `styles`. Style **phụ thuộc state/props** để trong mảng inline:

```tsx
style={[styles.chip, active && { backgroundColor: C.brandLt }]}
```

- Layout dùng-một-lần, ngắn (`{ flex: 1 }`, `{ marginTop: S.sm }`) được phép inline.
- Đặt tên key theo **vai trò trong màn**, không theo hình thức: `searchBar`, `sellerCard` — không `redBox`.

---

## 3. Spacing & kích thước

- Dùng `gap` cho khoảng cách giữa các con, không rải `marginRight` từng phần tử.
- Khoảng cách lấy từ `S`; số lẻ port 1-1 từ thiết kế được viết thẳng nhưng không vào bảng `S`.
- Vòng tròn: `borderRadius: size / 2` tính từ `size`, không hardcode cả hai.
- `zIndex` có ba mốc: `3` chi tiết nổi trong thẻ · `5` nút nổi trên hero · `100` toast. Cần lớp mới thì chèn giữa
  các mốc, đừng nhảy lên `9999`.

---

## 4. Không dùng

- Thư viện styling ngoài (styled-components, NativeWind, Tamagui, Unistyles): repo dùng `StyleSheet` thuần.
  Đổi là một quyết định kiến trúc, không phải một PR.
- `Dimensions.get('window')` ở top level — dùng `useWindowDimensions()`.
- `Math.random()` trong render cho biến thể thị giác: mọi biến thể suy từ `index` qua mảng hằng, nếu không layout
  nhảy mỗi lần re-render.
- Chế độ tối: chưa hỗ trợ (`userInterfaceStyle: light`). Thêm là đổi `C` thành hàm theo scheme ở **một** chỗ,
  không rải `useColorScheme()` vào từng component.
