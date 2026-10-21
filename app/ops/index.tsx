import { Redirect } from 'expo-router';

/**
 * Đường `/ops` gõ tay (web) mở Tổng quan, như `app/index.tsx` của app người dùng. Code luôn trỏ thẳng `/ops/home`:
 * typed routes của expo-router sinh route này thành `/ops/index` (thư mục có nhóm `(tabs)`), nên `/ops` không qua `tsc`.
 */
export default function OpsIndex() {
  return <Redirect href="/ops/home" />;
}
