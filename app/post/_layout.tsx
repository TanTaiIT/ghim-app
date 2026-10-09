import { Stack } from 'expo-router';
import { C } from '@/theme';

/** Ba bước đăng tin là một stack con: lùi giữa các bước không đóng luồng, nháp nằm ở `useDraftStore`. */
export default function PostLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paperWarm } }} />
  );
}
