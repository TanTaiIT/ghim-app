import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

/** Nhãn, icon, badge và nút Đăng tin ở giữa nằm trong `TabBar`; đây chỉ khai thứ tự tab. */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
