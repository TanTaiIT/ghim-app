import { Redirect } from 'expo-router';

/** Entry: bảng tin là nơi mọi người, kể cả khách, bắt đầu (TK 6). */
export default function Index() {
  return <Redirect href="/(tabs)/home" />;
}
