import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { OpsAccountList } from '@/components/OpsAccountList';
import { OpsHeader } from '@/components/OpsHeader';
import { C } from '@/theme';

/** Chọn tài khoản để gắn quyền staff: quyền gắn lên tài khoản người dùng đã có, không tạo tài khoản mới (spec). */
export default function OpsStaffPick() {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <OpsHeader back title="Gắn quyền staff" sub="Chọn một tài khoản đã có" />
      <OpsAccountList
        onOpen={(a) =>
          router.replace({ pathname: '/ops/staff/[id]', params: { id: a.id, name: a.displayName } })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: C.paper } });
