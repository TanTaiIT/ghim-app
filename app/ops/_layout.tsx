import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { OpsHeader } from '@/components/OpsHeader';
import { EmptyState, Loading } from '@/components/ui';
import { useFreshMe } from '@/queries/account';
import { useOpsTasks } from '@/queries/ops-review';
import { ApiError } from '@/api/http';
import { C } from '@/theme';

/**
 * Bàn vận hành (master, staff) — khu riêng trong app, header tối, thanh tab riêng. Ai được vào là `/me` (master, hoặc
 * staff có quyền đang hiệu lực), đọc lại mỗi lần vào. Hàng chờ "mọi việc" vẫn được hỏi để nói đúng những lỗi chặn cả
 * khu (đòi xác thực hai lớp, mất mạng); riêng 403 của nó không chặn: staff chỉ có việc toàn hệ thống (hỗ trợ, báo cáo
 * về người, giấy tờ) không có hàng duyệt tin, server trả 403 cho hàng chờ mà các mục kia họ vẫn làm được.
 */
export default function OpsLayout() {
  const me = useFreshMe();
  const gate = useOpsTasks(null);
  const code = gate.error instanceof ApiError ? gate.error.code : null;
  const allowed = me.data?.opsAccess === true;

  if (me.isPending || gate.isPending || (me.isFetching && !allowed)) return <Loading />;
  const blocked = !allowed || (gate.isError && code !== 'FORBIDDEN');
  if (blocked) {
    return (
      <View style={styles.screen}>
        <OpsHeader back title="Bàn vận hành" />
        <EmptyState
          icon={allowed ? 'wifi-off' : 'lock'}
          text={
            allowed ? (gate.error?.message ?? '') : 'Tài khoản này không có quyền master hay staff.'
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
