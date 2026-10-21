import { Tabs } from 'expo-router';
import { OpsTabBar } from '@/components/OpsTabBar';

/** Nhãn, icon, badge nằm trong `OpsTabBar`; đây chỉ khai thứ tự tab. */
export default function OpsTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <OpsTabBar {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="review" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="people" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
