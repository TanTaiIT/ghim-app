import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C, F } from '@/theme';

/** Icon theo tên route; thêm tab = thêm file trong `app/(tabs)/` VÀ một dòng ở đây. */
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  profile: 'person-circle',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.brandTx,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: F.uiSemi, fontSize: 11 },
        tabBarStyle: { backgroundColor: C.paperWarm, borderTopColor: C.line },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name] ?? 'ellipse'} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Bảng tin' }} />
      <Tabs.Screen name="profile" options={{ title: 'Cá nhân' }} />
    </Tabs>
  );
}
