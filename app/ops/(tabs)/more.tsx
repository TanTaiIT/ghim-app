import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MenuList, type MenuItem } from '@/components/MenuList';
import { OpsHeader } from '@/components/OpsHeader';
import { useMe } from '@/queries/account';
import { C, F, S } from '@/theme';

/**
 * Công cụ vận hành ngoài bốn tab chính. Mục chỉ master dùng được (nhóm, danh mục, lý do mẫu, trợ giúp, luật và số liệu máy) ẩn với
 * staff: server trả 403 cho họ, hiện mục đó chỉ để họ bấm vào một màn báo lỗi.
 */
export default function OpsMore() {
  const router = useRouter();
  const isMaster = useMe().data?.isMaster ?? false;

  const team: MenuItem[] = [
    { icon: 'help-circle', label: 'Hỗ trợ người dùng', onPress: () => router.push('/ops/support') },
    { icon: 'search', label: 'Tra mã tra cứu', onPress: () => router.push('/ops/lookup') },
    { icon: 'file-minus', label: 'Gỡ / khôi phục tin', onPress: () => router.push('/ops/listing') },
    { icon: 'zap', label: 'Đẩy tin & doanh thu', onPress: () => router.push('/ops/promotions') },
  ];
  const master: MenuItem[] = [
    { icon: 'shield', label: 'Staff', onPress: () => router.push('/ops/staff') },
    { icon: 'users', label: 'Nhóm', onPress: () => router.push('/ops/groups') },
    { icon: 'layers', label: 'Danh mục', onPress: () => router.push('/ops/categories') },
    { icon: 'x-octagon', label: 'Lý do từ chối mẫu', onPress: () => router.push('/ops/reasons') },
    { icon: 'help-circle', label: 'Trợ giúp', onPress: () => router.push('/ops/help') },
    { icon: 'sliders', label: 'Luật máy duyệt', onPress: () => router.push('/ops/rules') },
    { icon: 'bar-chart-2', label: 'Số liệu máy duyệt', onPress: () => router.push('/ops/machine') },
  ];

  return (
    <View style={styles.screen}>
      <OpsHeader title="Thêm" sub="Công cụ vận hành" />
      <ScrollView contentContainerStyle={styles.content}>
        <MenuList items={team} />
        {isMaster && (
          <>
            <Text style={styles.section}>Chỉ master</Text>
            <MenuList items={master} />
          </>
        )}
        <MenuList
          items={[
            {
              icon: 'log-out',
              label: 'Về app người dùng',
              onPress: () => router.dismissTo('/(tabs)/profile'),
            },
          ]}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  content: { padding: S.lg, gap: S.md },
  section: { marginTop: S.sm, fontFamily: F.uiBold, fontSize: 13, color: C.inkSoft },
});
