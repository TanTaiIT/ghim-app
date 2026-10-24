import { Stack } from 'expo-router';
import { C } from '@/theme';

/**
 * Quản trị nhóm là một stack con sau MỘT chốt đăng nhập ở `app/_layout.tsx` (HARD#17). Trang nhóm `group/[id]` nằm
 * ngoài vì khách cũng xem được nhóm công khai.
 */
export default function GroupManageLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }} />
  );
}
