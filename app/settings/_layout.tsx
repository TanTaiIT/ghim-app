import { Stack } from 'expo-router';
import { C } from '@/theme';

/** Cài đặt là một stack con: cả nhóm nằm sau MỘT chốt đăng nhập ở `app/_layout.tsx` (HARD#17). */
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }} />
  );
}
