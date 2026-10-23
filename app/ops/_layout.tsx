import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState, Loading } from '@/components/ui';
import { useOpsTasks } from '@/queries/ops-review';
import { ApiError } from '@/api/http';
import { C } from '@/theme';

/**
 * Bàn vận hành (master, staff) — khu riêng trong app, header tối, thanh tab riêng. Cổng vào là chính hàng chờ "mọi việc":
 * server chặn mọi `/ops/*` theo cùng một luật (master, hoặc staff có quyền đang hiệu lực), nên lỗi của nó nói đúng ai
 * được vào.
 */
export default function OpsLayout() {
  const gate = useOpsTasks(null);
  const code = gate.error instanceof ApiError ? gate.error.code : null;

  if (gate.isPending) return <Loading />;
  if (gate.isError) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Bàn vận hành" />
        <EmptyState
          icon={code === 'FORBIDDEN' ? 'lock' : 'wifi-off'}
          text={
            code === 'FORBIDDEN'
              ? 'Tài khoản này không có quyền master hay staff.'
              : gate.error.message
          }
        />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }} />
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: C.paper } });
